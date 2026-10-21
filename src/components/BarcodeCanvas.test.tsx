import { cleanup, render, screen } from '@testing-library/preact'
import { toCanvas } from 'bwip-js/browser'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { loadBarcodeRendering } from '../hooks/useBarcodeRendering'
import { BarcodeCanvas } from './BarcodeCanvas'

// happy-dom has no 2D canvas context, so bwip-js can't draw.
vi.mock('bwip-js/browser', () => ({ toCanvas: vi.fn() }))

describe('BarcodeCanvas', () => {
  // Loaded up front, so codes are drawn on the first render.
  beforeAll(loadBarcodeRendering)

  afterEach(() => {
    cleanup()
    vi.mocked(toCanvas).mockReset()
  })

  it('shows the rendered barcode', () => {
    render(<BarcodeCanvas value="12345678" format={BarcodeFormat.CODE_128} />)

    expect(screen.getByRole('img', { name: 'Barcode for 12345678' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('fills the width available at the device pixel ratio', () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(350)
    vi.mocked(toCanvas).mockImplementation((canvas, options) => {
      const element = canvas as HTMLCanvasElement
      element.width = 100 * options.scale!
      return element
    })

    render(<BarcodeCanvas value="12345678" format={BarcodeFormat.CODE_128} />)

    expect(vi.mocked(toCanvas).mock.lastCall![1].scale).toBe(10)
    const canvas = screen.getByRole('img', { name: 'Barcode for 12345678' }) as HTMLCanvasElement
    expect(parseFloat(canvas.style.width)).toBeCloseTo(1000 / 3)
  })

  it("explains when the code can't be rendered", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(toCanvas).mockImplementation(() => {
      throw new Error('bwipp.ean13badLength')
    })

    render(<BarcodeCanvas value="12345" format={BarcodeFormat.EAN_13} />)

    expect(screen.getByRole('alert').textContent).toContain("Can't show this barcode")
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('names the QR code in the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(toCanvas).mockImplementation(() => {
      throw new Error('bwipp.qrcodeInputTooLong')
    })

    render(<BarcodeCanvas value="12345" format={QRCodeFormat.QR_CODE} />)

    expect(screen.getByRole('alert').textContent).toContain("Can't show this QR code")
  })

  it('can be shown large with its own label', () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.className.includes('max-w-80') ? 320 : 160
      },
    )
    vi.mocked(toCanvas).mockImplementation((canvas, options) => {
      const element = canvas as HTMLCanvasElement
      element.width = 100 * options.scale!
      return element
    })

    render(
      <BarcodeCanvas
        value="TESSERA-OFFER:abc"
        format={QRCodeFormat.QR_CODE}
        size="large"
        label="Transfer code"
      />,
    )

    expect(screen.getByRole('img', { name: 'Transfer code' })).toBeTruthy()
    expect(vi.mocked(toCanvas).mock.lastCall![1].scale).toBe(3)
  })
})
