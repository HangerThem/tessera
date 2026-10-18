import { afterEach, describe, expect, it } from 'vitest'

import type { Signal } from './transfer'

import { decodeSignal, encodeSignal, startReceiving, startSending, TransferError } from './transfer'

// A Chrome data-channel offer with two hidden (mDNS) local addresses, as created without STUN.
const chromeOffer = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  'a=candidate:1467250027 1 udp 2122260223 4b6d5a7e-0f0c-4d3e-9c1a-2f5c8e7b9a10.local 54321 typ host generation 0 network-id 1 network-cost 10',
  'a=candidate:2954128273 1 udp 2122194687 9a0e3c2b-7d1f-4b6a-8e5c-1f2d3c4b5a69.local 54322 typ host generation 0 network-id 2 network-cost 10',
  'a=ice-ufrag:Lq3v',
  'a=ice-pwd:8m1XWJx0o4f2b7y3zQk9aR5s',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 7B:8B:F0:65:5F:78:E2:51:3B:AC:6F:F3:3F:46:1B:35:DC:B8:5F:64:1A:24:C2:43:F0:A1:58:D0:A1:2C:19:08',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
  '',
].join('\r\n')

describe('encodeSignal', () => {
  it('round-trips an offer and an answer', async () => {
    const offer = { type: 'offer', sdp: chromeOffer } as const
    const answer = { type: 'answer', sdp: chromeOffer.replace('actpass', 'active') } as const

    expect(await decodeSignal(await encodeSignal(offer), 'offer')).toEqual(offer)
    expect(await decodeSignal(await encodeSignal(answer), 'answer')).toEqual(answer)
  })

  it('fits comfortably in a QR code', async () => {
    const code = await encodeSignal({ type: 'offer', sdp: chromeOffer })

    expect(code.length).toBeLessThan(chromeOffer.length)
    // About QR version 20, which phone cameras scan reliably at the size it's shown.
    expect(code.length).toBeLessThan(700)
  })
})

describe('decodeSignal', () => {
  it('rejects codes that are not a Tessera transfer code', async () => {
    await expect(decodeSignal('https://example.com', 'offer')).rejects.toThrow(
      "This isn't a Tessera transfer code.",
    )
    await expect(decodeSignal('TESSERA-OFFER:@@@', 'offer')).rejects.toThrow(TransferError)
  })

  it('says which phone to scan when given the wrong code', async () => {
    const answer = await encodeSignal({ type: 'answer', sdp: chromeOffer })

    await expect(decodeSignal(answer, 'offer')).rejects.toThrow(
      'This code is from the sending phone. Scan the code shown on the receiving phone.',
    )
  })
})

/** Fakes just enough of WebRTC to link two devices in memory. */
class FakeChannel extends EventTarget {
  readyState: RTCDataChannelState = 'connecting'
  bufferedAmount = 0
  bufferedAmountLowThreshold = 0
  peer?: FakeChannel
  /** Simulates a dropped connection after this many messages. */
  dropAfter = Infinity

  send(data: string) {
    if (this.dropAfter-- <= 0) {
      this.close()
      return
    }
    queueMicrotask(() => this.peer?.dispatchEvent(new MessageEvent('message', { data })))
  }

  open() {
    this.readyState = 'open'
    this.dispatchEvent(new Event('open'))
  }

  close() {
    if (this.readyState === 'closed') return
    this.readyState = 'closed'
    this.dispatchEvent(new Event('close'))
    this.peer?.close()
  }
}

const peers = new Map<string, FakePeerConnection>()
let nextPeerId = 0

class FakePeerConnection extends EventTarget {
  static blocked = false
  static dropAfter = Infinity
  id = nextPeerId++
  iceGatheringState: RTCIceGatheringState = 'complete'
  localDescription: Signal | null = null
  channel?: FakeChannel

  createDataChannel() {
    this.channel = new FakeChannel()
    return this.channel
  }

  async createOffer() {
    return { type: 'offer', sdp: `offer-${this.id}` }
  }

  async createAnswer() {
    return { type: 'answer', sdp: `answer-${this.id}` }
  }

  async setLocalDescription(description: Signal) {
    this.localDescription = description
    peers.set(description.sdp, this)
  }

  async setRemoteDescription(description: Signal) {
    const remote = peers.get(description.sdp)!
    // The offering side sets the answer last, which is when the devices connect.
    if (description.type !== 'answer' || FakePeerConnection.blocked) return

    const channel = new FakeChannel()
    channel.peer = this.channel
    this.channel!.peer = channel
    this.channel!.dropAfter = FakePeerConnection.dropAfter
    channel.dropAfter = FakePeerConnection.dropAfter
    remote.dispatchEvent(Object.assign(new Event('datachannel'), { channel }))
    queueMicrotask(() => {
      channel.open()
      this.channel!.open()
    })
  }

  close() {
    this.channel?.close()
  }
}

const createPeerConnection = () => new FakePeerConnection() as unknown as RTCPeerConnection

describe('device transfer', () => {
  afterEach(() => {
    FakePeerConnection.blocked = false
    FakePeerConnection.dropAfter = Infinity
    peers.clear()
  })

  it('sends the payload from one device to the other', async () => {
    const receiver = await startReceiving({ createPeerConnection })
    const sender = await startSending(receiver.offerCode, 'the backup', { createPeerConnection })

    const received = await receiver.receive(sender.answerCode)

    expect(received).toBe('the backup')
    await expect(sender.sent).resolves.toBeUndefined()
  })

  it('sends large payloads in chunks and reports progress', async () => {
    const payload = 'x'.repeat(100_000)
    const progress: number[] = []
    const receiver = await startReceiving({
      createPeerConnection,
      onProgress: (fraction) => progress.push(fraction),
    })
    const sender = await startSending(receiver.offerCode, payload, { createPeerConnection })

    expect(await receiver.receive(sender.answerCode)).toBe(payload)
    expect(progress.length).toBeGreaterThan(2)
    expect(progress).toEqual(progress.toSorted((a, b) => a - b))
    expect(progress.at(-1)).toBe(1)
  })

  it("explains when the devices can't connect", async () => {
    FakePeerConnection.blocked = true
    const receiver = await startReceiving({ createPeerConnection, connectTimeout: 20 })
    const sender = await startSending(receiver.offerCode, 'the backup', { createPeerConnection })

    await expect(receiver.receive(sender.answerCode)).rejects.toThrow(
      "The phones couldn't connect. Make sure both are on the same Wi-Fi, not a guest network, and try again.",
    )
  })

  it('explains when the connection is lost during the transfer', async () => {
    FakePeerConnection.dropAfter = 2
    const receiver = await startReceiving({ createPeerConnection })
    const sender = await startSending(receiver.offerCode, 'x'.repeat(100_000), {
      createPeerConnection,
    })

    await expect(receiver.receive(sender.answerCode)).rejects.toThrow(
      'The connection was lost. Keep both phones close and try again.',
    )
    await expect(sender.sent).rejects.toThrow(TransferError)
  })
})
