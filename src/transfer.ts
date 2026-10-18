/**
 * Direct transfer of cards between two devices over a WebRTC data channel.
 *
 * There's no signalling server: the receiving device shows its connection details (the offer) as a
 * QR code, the sending device scans it and shows its answer, and the receiving device scans that.
 * No STUN or TURN servers are used either, so the devices must be on the same network, and nothing
 * but the two devices is involved.
 */

type SignalType = 'offer' | 'answer'

export type Signal = { type: SignalType; sdp: string }

/** A transfer that can't go ahead. The message is meant to be shown to the user. */
export class TransferError extends Error {
  name = 'TransferError'
}

const SIGNAL_PREFIX: Record<SignalType, string> = {
  offer: 'TESSERA-OFFER:',
  answer: 'TESSERA-ANSWER:',
}

const WRONG_SIGNAL_MESSAGE: Record<SignalType, string> = {
  offer: 'This code is from the sending phone. Scan the code shown on the receiving phone.',
  answer: 'This code is from the receiving phone. Scan the code shown on the sending phone.',
}

/**
 * Encodes connection details as a transfer code for a QR code: compressed, then base64url encoded,
 * with a prefix saying whether it's an offer or an answer.
 *
 * @param {Signal} signal - The local description of the connection.
 * @returns {Promise<string>} The transfer code.
 */
export async function encodeSignal({ type, sdp }: Signal): Promise<string> {
  const compressed = await transform(
    new TextEncoder().encode(sdp),
    new CompressionStream('deflate'),
  )
  return SIGNAL_PREFIX[type] + toBase64Url(compressed)
}

/**
 * Decodes a transfer code scanned from the other device.
 *
 * @param {string} code - The scanned transfer code.
 * @param {SignalType} expected - Which kind of code this step needs.
 * @returns {Promise<Signal>} The other device's description of the connection.
 * @throws {TransferError} If it isn't a transfer code, or is the wrong kind of code.
 */
export async function decodeSignal(code: string, expected: SignalType): Promise<Signal> {
  const other: SignalType = expected === 'offer' ? 'answer' : 'offer'
  if (code.startsWith(SIGNAL_PREFIX[other])) throw new TransferError(WRONG_SIGNAL_MESSAGE[expected])
  if (!code.startsWith(SIGNAL_PREFIX[expected])) {
    throw new TransferError("This isn't a Tessera transfer code.")
  }

  try {
    const compressed = fromBase64Url(code.slice(SIGNAL_PREFIX[expected].length))
    const sdp = new TextDecoder().decode(
      await transform(compressed, new DecompressionStream('deflate')),
    )
    return { type: expected, sdp }
  } catch {
    throw new TransferError("This isn't a Tessera transfer code.")
  }
}

async function transform(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const output = new Blob([data as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const CONNECT_ERROR =
  "The phones couldn't connect. Make sure both are on the same Wi-Fi, not a guest network, and try again."
const LOST_ERROR = 'The connection was lost. Keep both phones close and try again.'

/** Data channel messages are kept well under every browser's size limit. */
const CHUNK_SIZE = 16_000
/** Sending waits while more than this is queued, so large payloads don't fill the buffer. */
const MAX_BUFFERED = 1_000_000
/** Gathering local addresses takes milliseconds on a LAN; don't wait forever for a straggler. */
const ICE_GATHERING_TIMEOUT = 3_000

type TransferOptions = {
  /** Replaced in tests, which have no WebRTC. */
  createPeerConnection?: () => RTCPeerConnection
  /** How long the receiving device waits for the connection after scanning the answer. */
  connectTimeout?: number
  /** Called with the fraction received so far, from 0 to 1. */
  onProgress?: (fraction: number) => void
}

// No STUN or TURN servers: only direct connections on the local network, and no third party.
const defaultPeerConnection = () => new RTCPeerConnection({ iceServers: [] })

/**
 * Starts receiving on this device by creating the offer to show as a QR code.
 *
 * @returns The offer's transfer code, and `receive`, which takes the sending device's answer and
 * resolves with the payload once it has fully arrived.
 */
export async function startReceiving({
  createPeerConnection = defaultPeerConnection,
  connectTimeout = 15_000,
  onProgress,
}: TransferOptions = {}) {
  const connection = createPeerConnection()
  const channel = connection.createDataChannel('cards')
  const offerCode = await createLocalSignal(connection, () => connection.createOffer())

  const receive = async (answerCode: string): Promise<string> => {
    // Listen before connecting, so the first message can't arrive before anyone is listening.
    const payload = receivePayload(channel, onProgress)
    payload.catch(() => {})

    await connection.setRemoteDescription(await decodeSignal(answerCode, 'answer'))
    await withTimeout(whenOpen(channel), connectTimeout, CONNECT_ERROR)
    const received = await payload
    channel.send(JSON.stringify({ type: 'received' }))
    return received
  }

  return { offerCode, receive, close: () => connection.close() }
}

/**
 * Starts sending a payload to the device that showed the offer.
 *
 * @returns The answer's transfer code to show as a QR code, and `sent`, which resolves once the
 * other device has received everything.
 */
export async function startSending(
  offerCode: string,
  payload: string,
  { createPeerConnection = defaultPeerConnection }: TransferOptions = {},
) {
  const connection = createPeerConnection()
  const offer = await decodeSignal(offerCode, 'offer')

  // Listen before the connection can open, so the channel event isn't missed.
  const channelOpened = new Promise<RTCDataChannel>((resolve) => {
    connection.addEventListener('datachannel', (event) => {
      const { channel } = event as RTCDataChannelEvent
      whenOpen(channel).then(() => resolve(channel))
    })
  })

  await connection.setRemoteDescription(offer)
  const answerCode = await createLocalSignal(connection, () => connection.createAnswer())

  // No timeout: the other device connects whenever its user gets round to scanning the answer.
  const sent = channelOpened.then((channel) => sendPayload(channel, payload))
  // Callers may close before awaiting `sent`; don't report that as unhandled.
  sent.catch(() => {})

  return { answerCode, sent, close: () => connection.close() }
}

async function createLocalSignal(
  connection: RTCPeerConnection,
  create: () => Promise<RTCSessionDescriptionInit>,
): Promise<string> {
  await connection.setLocalDescription(await create())
  // There's no signalling channel to trickle addresses through later, so wait for all of them.
  await iceGathered(connection)
  const { type, sdp } = connection.localDescription!
  return encodeSignal({ type: type as SignalType, sdp })
}

function iceGathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ICE_GATHERING_TIMEOUT)
    connection.addEventListener('icegatheringstatechange', () => {
      if (connection.iceGatheringState !== 'complete') return
      clearTimeout(timer)
      resolve()
    })
  })
}

function whenOpen(channel: RTCDataChannel): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve()
  return new Promise((resolve, reject) => {
    channel.addEventListener('open', () => resolve(), { once: true })
    channel.addEventListener('close', () => reject(new TransferError(CONNECT_ERROR)), {
      once: true,
    })
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TransferError(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * The payload is sent as a header with its length, then the chunks. The receiving device answers
 * with "received" once it has everything.
 */
function sendPayload(channel: RTCDataChannel, payload: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false
    channel.addEventListener('message', (event) => {
      if (parseMessage(event.data)?.type !== 'received') return
      done = true
      resolve()
    })
    channel.addEventListener('close', () => {
      if (!done) reject(new TransferError(LOST_ERROR))
    })

    void (async () => {
      channel.send(JSON.stringify({ type: 'start', length: payload.length }))
      for (let offset = 0; offset < payload.length; offset += CHUNK_SIZE) {
        if (channel.readyState !== 'open') return
        // Sequential on purpose: wait for the buffer to drain before queueing more.
        // eslint-disable-next-line no-await-in-loop
        if (channel.bufferedAmount > MAX_BUFFERED) await bufferDrained(channel)
        channel.send(payload.slice(offset, offset + CHUNK_SIZE))
      }
    })()
  })
}

function bufferDrained(channel: RTCDataChannel): Promise<void> {
  channel.bufferedAmountLowThreshold = MAX_BUFFERED / 2
  return new Promise((resolve) =>
    channel.addEventListener('bufferedamountlow', () => resolve(), { once: true }),
  )
}

function receivePayload(
  channel: RTCDataChannel,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let length: number | undefined
    let received = ''

    channel.addEventListener('message', (event) => {
      if (length === undefined) {
        const message = parseMessage(event.data)
        if (message?.type !== 'start' || typeof message.length !== 'number') return
        length = message.length
        onProgress?.(0)
      } else {
        received += event.data
        onProgress?.(length === 0 ? 1 : received.length / length)
      }
      if (received.length === length) resolve(received)
    })
    channel.addEventListener('close', () => {
      if (length === undefined || received.length < length) reject(new TransferError(LOST_ERROR))
    })
  })
}

function parseMessage(data: unknown): { type?: string; length?: unknown } | undefined {
  if (typeof data !== 'string' || !data.startsWith('{')) return undefined
  try {
    return JSON.parse(data)
  } catch {
    return undefined
  }
}
