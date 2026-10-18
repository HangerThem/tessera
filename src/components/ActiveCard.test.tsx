import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { toCanvas, toSVG } from 'bwip-js/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { updateCardById } from '../store'
import { ActiveCard } from './ActiveCard'

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  set: async () => {},
  update: async () => {},
  keys: async () => [],
  getMany: async () => [],
}))

const photos = vi.hoisted(() => ({
  getPhoto: vi.fn(async (): Promise<Blob | undefined> => undefined),
  savePhoto: vi.fn(async () => {}),
  deletePhoto: vi.fn(async () => {}),
}))

vi.mock('../photos', () => photos)

// happy-dom has no 2D canvas context, so bwip-js can't draw.
vi.mock('bwip-js/browser', () => ({ toCanvas: vi.fn(), toSVG: vi.fn() }))

const card: Card = {
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  format: BarcodeFormat.CODE_128,
  isFavorite: false,
  color: '#3b82f6',
}

const qrCard = (barcodeValue: string): Card => ({
  ...card,
  barcodeValue,
  format: QRCodeFormat.QR_CODE,
})

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

  it('shares an image sharp enough for high-DPI screens', async () => {
    vi.mocked(toCanvas).mockImplementation((canvas, options) => {
      const element = canvas as HTMLCanvasElement
      element.width = 100 * options.scale!
      return element
    })
    render(<ActiveCard card={card} />)

    fireEvent.click(shareImageButton())

    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const [canvas] = vi.mocked(toCanvas).mock.lastCall!
    expect((canvas as HTMLCanvasElement).width).toBeGreaterThanOrEqual(900)
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

describe('ActiveCard format', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(toCanvas).mockReset()
    vi.mocked(toSVG).mockReset()
  })

  it('opens a QR code card as a QR code', () => {
    render(<ActiveCard card={qrCard('https://example.com/member/123')} />)

    expect(screen.getByRole('img', { name: /^QR code for/ })).toBeTruthy()
    expect(screen.getByText('QR code')).toBeTruthy()
    expect(vi.mocked(toCanvas).mock.lastCall![1]).toMatchObject({ bcid: 'qrcode' })
  })

  it('only offers the other kind of code when it would be legible', () => {
    // bwip-js is mocked, so fake its SVG: about 25 px of bars per character.
    vi.mocked(toSVG).mockImplementation(
      ({ text }) => `<svg viewBox="0 0 ${String(text).length * 25} 161"></svg>`,
    )

    render(<ActiveCard card={qrCard('https://example.com/member/123')} />)
    expect(screen.queryByRole('group', { name: 'Display format' })).toBeNull()
    cleanup()

    render(<ActiveCard card={qrCard('MEMBER-12')} />)
    expect(screen.getByRole('group', { name: 'Display format' })).toBeTruthy()
  })
})

describe('ActiveCard note', () => {
  afterEach(cleanup)

  it('keeps the note hidden until asked, since staff see this screen at checkout', () => {
    render(<ActiveCard card={{ ...card, note: 'PIN 1234' }} />)
    expect(screen.queryByText('PIN 1234')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show note' }))
    expect(screen.getByText('PIN 1234')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hide note' }))
    expect(screen.queryByText('PIN 1234')).toBeNull()
  })

  it('shows nothing for a card without a note', () => {
    render(<ActiveCard card={card} />)

    expect(screen.queryByRole('button', { name: 'Show note' })).toBeNull()
  })

  it('leaves the note out of shared text', async () => {
    const share = vi.fn(async (_data: ShareData) => {})
    Object.assign(navigator, { share, canShare: () => true })
    render(<ActiveCard card={{ ...card, note: 'PIN 1234' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(JSON.stringify(share.mock.calls[0][0])).not.toContain('PIN 1234')
  })
})

describe('ActiveCard photo', () => {
  afterEach(() => {
    cleanup()
    photos.getPhoto.mockResolvedValue(undefined)
  })

  it('shows the photo of the card, for staff who want to see the card itself', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() })
    photos.getPhoto.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }))
    render(<ActiveCard card={card} />)

    const photo = (await screen.findByRole('img', { name: 'Photo of Grocery' })) as HTMLImageElement
    expect(photo.src).toBe('blob:photo')
    expect(photos.getPhoto).toHaveBeenCalledWith(card.id)
  })

  it('shows nothing for a card without a photo', async () => {
    render(<ActiveCard card={card} />)

    await waitFor(() => expect(photos.getPhoto).toHaveBeenCalled())
    expect(screen.queryByRole('img', { name: 'Photo of Grocery' })).toBeNull()
  })
})

describe('ActiveCard photo after an edit', () => {
  afterEach(() => {
    cleanup()
    photos.getPhoto.mockResolvedValue(undefined)
  })

  it('shows a photo added by editing the card, without reopening it', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() })
    render(<ActiveCard card={card} />)
    await waitFor(() => expect(photos.getPhoto).toHaveBeenCalled())

    const photo = new Blob(['jpeg'], { type: 'image/jpeg' })
    photos.getPhoto.mockResolvedValue(photo)
    await updateCardById(card.id, card, photo)

    expect(await screen.findByRole('img', { name: 'Photo of Grocery' })).toBeTruthy()
  })
})
