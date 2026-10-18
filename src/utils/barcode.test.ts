import { toCanvas } from 'bwip-js/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { getBarcodeScale, renderBarcode, validateBarcodeValue } from './barcode'

// happy-dom has no 2D canvas context, so drawing is faked: each scale step adds 100 px of width.
vi.mock('bwip-js/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('bwip-js/browser')>()),
  toCanvas: vi.fn((canvas: HTMLCanvasElement, options: { scale: number }) => {
    canvas.width = 100 * options.scale
    canvas.height = 40 * options.scale
  }),
}))

const PX_PER_MM = 72 / 25.4

describe('validateBarcodeValue', () => {
  it('accepts values that fit the format', () => {
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '4006381333931')).toBeUndefined()
    expect(validateBarcodeValue(BarcodeFormat.CODE_128, 'ABC-123')).toBeUndefined()
    expect(validateBarcodeValue(QRCodeFormat.QR_CODE, 'https://example.com')).toBeUndefined()
  })

  it('describes why a value does not fit the format', () => {
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '400638133393X')).toBe(
      'EAN-13 must contain only digits',
    )
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '4006381333932')).toBe(
      'Incorrect EAN-13 check digit provided',
    )
    expect(validateBarcodeValue(BarcodeFormat.EAN_8, '1234')).toBe('EAN-8 must be 7 or 8 digits')
  })
})

describe('getBarcodeScale', () => {
  it('uses the largest whole scale that fits the target width', () => {
    expect(getBarcodeScale(100, 1050)).toBe(10)
    expect(getBarcodeScale(168, 1050)).toBe(6)
  })

  it('never goes below scale 1', () => {
    expect(getBarcodeScale(300, 200)).toBe(1)
  })
})

describe('renderBarcode', () => {
  afterEach(() => vi.mocked(toCanvas).mockClear())

  it('draws at the device pixel ratio and sizes the canvas back down with CSS', () => {
    const element = document.createElement('canvas')

    renderBarcode({
      element,
      value: '123',
      format: 'code128',
      isQRCode: false,
      width: 350,
      pixelRatio: 3,
    })

    const options = vi.mocked(toCanvas).mock.lastCall![1]
    expect(options.scale).toBe(10)
    expect(element.width).toBe(1000)
    expect(element.style.width).toBe(`${1000 / 3}px`)
    // Bars are 64 CSS px tall, i.e. 192 device px at 3x.
    expect(options.height! * PX_PER_MM * options.scale!).toBeCloseTo(192)
  })

  it('keeps QR codes square', () => {
    const element = document.createElement('canvas')

    renderBarcode({
      element,
      value: '123',
      format: 'qrcode',
      isQRCode: true,
      width: 160,
      pixelRatio: 2,
    })

    const options = vi.mocked(toCanvas).mock.lastCall![1]
    expect(options.scale).toBe(3)
    expect(options.height).toBeUndefined()
    expect(element.style.width).toBe('150px')
  })
})
