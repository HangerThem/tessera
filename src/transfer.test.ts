import { describe, expect, it } from 'vitest'

import { decodeSignal, encodeSignal, TransferError } from './transfer'

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
