import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'

import { QRCodeFormat } from '../enums/codeFormats'
import { startReceiving, startSending, TransferError } from '../transfer'
import { ReceiveCards, SendCards } from './DeviceTransfer'

const scanners = vi.hoisted(
  () => [] as { options: BarcodeScannerOptions; start: () => void; stop: () => void }[],
)

vi.mock('../barcodeScanner', () => ({
  BarcodeScanner: class {
    start = vi.fn(() => this.options.onStateChange?.('requesting'))
    stop = vi.fn(() => this.options.onStateChange?.('idle'))
    constructor(public options: BarcodeScannerOptions) {
      scanners.push(this)
    }
  },
}))

vi.mock('../transfer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../transfer')>()),
  startReceiving: vi.fn(),
  startSending: vi.fn(),
}))

// happy-dom has no 2D canvas context, so bwip-js can't draw.
vi.mock('bwip-js/browser', () => ({ toCanvas: vi.fn(), toSVG: vi.fn() }))

const transferCode = () => screen.queryByRole('img', { name: 'Transfer code' })

/** Scans a code, as if the camera had found it. */
function scan(buttonName: string, value: string) {
  fireEvent.click(screen.getByRole('button', { name: buttonName }))
  const scanner = scanners.at(-1)!
  act(() => {
    scanner.stop()
    scanner.options.onDetect(value, QRCodeFormat.QR_CODE)
  })
}

afterEach(() => {
  cleanup()
  scanners.length = 0
})

describe('ReceiveCards', () => {
  let receive: ReturnType<typeof vi.fn>
  let close: ReturnType<typeof vi.fn>

  beforeEach(() => {
    receive = vi.fn(async () => 'the backup')
    close = vi.fn()
    vi.mocked(startReceiving).mockResolvedValue({ offerCode: 'TESSERA-OFFER:abc', receive, close })
  })

  it('shows its code, scans the reply and hands over what it received', async () => {
    const onReceived = vi.fn()
    render(<ReceiveCards onReceived={onReceived} onCancel={() => {}} />)

    expect(await screen.findByRole('img', { name: 'Transfer code' })).toBeTruthy()
    scan("Scan the other phone's code", 'TESSERA-ANSWER:xyz')

    await waitFor(() => expect(onReceived).toHaveBeenCalledWith('the backup'))
    expect(receive).toHaveBeenCalledWith('TESSERA-ANSWER:xyz')
  })

  it('shows progress while receiving', async () => {
    receive.mockReturnValue(new Promise(() => {}))
    render(<ReceiveCards onReceived={() => {}} onCancel={() => {}} />)
    await screen.findByRole('img', { name: 'Transfer code' })

    scan("Scan the other phone's code", 'TESSERA-ANSWER:xyz')
    act(() => vi.mocked(startReceiving).mock.calls[0][0]!.onProgress!(0.5))

    expect(screen.getByText('Receiving cards… 50%')).toBeTruthy()
  })

  it('explains a failed transfer and can start again', async () => {
    receive.mockRejectedValue(new TransferError("The phones couldn't connect."))
    render(<ReceiveCards onReceived={() => {}} onCancel={() => {}} />)
    await screen.findByRole('img', { name: 'Transfer code' })

    scan("Scan the other phone's code", 'TESSERA-ANSWER:xyz')

    expect((await screen.findByRole('alert')).textContent).toContain("The phones couldn't connect.")
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
    await waitFor(() => expect(startReceiving).toHaveBeenCalledTimes(2))
    expect(close).toHaveBeenCalled()
  })

  it("says so when the browser can't transfer directly", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(startReceiving).mockRejectedValue(new ReferenceError('RTCPeerConnection'))
    render(<ReceiveCards onReceived={() => {}} onCancel={() => {}} />)

    expect((await screen.findByRole('alert')).textContent).toContain(
      "This browser can't transfer cards directly. Use a backup file instead.",
    )
    expect(transferCode()).toBeNull()
  })

  it('closes the connection when cancelled', async () => {
    const onCancel = vi.fn()
    render(<ReceiveCards onReceived={() => {}} onCancel={onCancel} />)
    await screen.findByRole('img', { name: 'Transfer code' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
  })
})

describe('SendCards', () => {
  let resolveSent: () => void
  let close: ReturnType<typeof vi.fn>

  beforeEach(() => {
    close = vi.fn()
    vi.mocked(startSending).mockImplementation(async () => ({
      answerCode: 'TESSERA-ANSWER:xyz',
      sent: new Promise<void>((resolve) => (resolveSent = resolve)),
      close,
    }))
  })

  it("scans the other phone's code, shows its reply and says when it's sent", async () => {
    render(<SendCards payload="the backup" cardCount={2} onDone={() => {}} onCancel={() => {}} />)
    expect(transferCode()).toBeNull()

    scan("Scan the other phone's code", 'TESSERA-OFFER:abc')

    expect(await screen.findByRole('img', { name: 'Transfer code' })).toBeTruthy()
    expect(startSending).toHaveBeenCalledWith('TESSERA-OFFER:abc', 'the backup')
    act(() => resolveSent())
    expect(await screen.findByText('Sent 2 cards to the other phone.')).toBeTruthy()
  })

  it("explains a code it can't use and can scan again", async () => {
    vi.mocked(startSending).mockRejectedValue(
      new TransferError("This isn't a Tessera transfer code."),
    )
    render(<SendCards payload="the backup" cardCount={2} onDone={() => {}} onCancel={() => {}} />)

    scan("Scan the other phone's code", 'https://example.com')

    expect((await screen.findByRole('alert')).textContent).toContain(
      "This isn't a Tessera transfer code.",
    )
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeTruthy()
  })
})
