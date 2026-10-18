import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { toCanvas, toSVG } from 'bwip-js/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { ActiveCard } from './ActiveCard'

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  keys: async () => [],
  getMany: async () => [],
}))

// happy-dom has no 2D canvas context, so bwip-js can't draw.
vi.mock('bwip-js/browser', () => ({ toCanvas: vi.fn(), toSVG: vi.fn() }))

const card: Card = {
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  barcodeFormat: BarcodeFormat.CODE_128,
  qrCodeFormat: QRCodeFormat.QR_CODE,
  isFavorite: false,
  color: '#3b82f6',
}

const shareImageButton = () => screen.getByRole('button', { name: 'Share as Image' })

describe('ActiveCard share as image', () => {
  let share: ReturnType<typeof vi.fn>

  beforeEach(() => {
    share = vi.fn(async () => {})
    Object.assign(navigator, { share, canShare: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    )
  })

  afterEach(() => {
    cleanup()
    vi.mocked(toCanvas).mockReset()
    vi.mocked(toSVG).mockReset()
  })

  it('shares a PNG of the barcode', async () => {
    render(<ActiveCard card={card} />)

    fireEvent.click(shareImageButton())

    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const [file] = share.mock.calls[0][0].files as File[]
    expect(file.name).toBe('Grocery-barcode.png')
    expect(file.type).toBe('image/png')
    expect(toCanvas).toHaveBeenLastCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ bcid: 'code128', text: '12345678' }),
    )
  })

  it('shares a PNG of the QR code when it is displayed', async () => {
    render(<ActiveCard card={card} />)
    fireEvent.click(screen.getByRole('button', { name: 'QR Code' }))

    fireEvent.click(shareImageButton())

    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    expect((share.mock.calls[0][0].files as File[])[0].name).toBe('Grocery-qr.png')
    expect(toCanvas).toHaveBeenLastCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ bcid: 'qrcode' }),
    )
  })

  it("doesn't share when the code can't be rendered", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ActiveCard card={card} />)
    vi.mocked(toCanvas).mockImplementation(() => {
      throw new Error('bwipp.code128badCharacter')
    })

    fireEvent.click(shareImageButton())

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Error rendering barcode:', expect.any(Error)),
    )
    expect(share).not.toHaveBeenCalled()
  })

  it("hides Share as Image when the displayed code can't be rendered", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(toSVG).mockImplementation(({ bcid }) => {
      if (bcid === 'code128') throw new Error('bwipp.code128badCharacter')
      return '<svg/>'
    })
    render(<ActiveCard card={card} />)

    expect(screen.queryByRole('button', { name: 'Share as Image' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'QR Code' }))

    expect(screen.queryByRole('button', { name: 'Share as Image' })).not.toBeNull()
  })
})
