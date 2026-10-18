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
