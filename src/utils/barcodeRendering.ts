import { toCanvas, toSVG } from 'bwip-js/browser'

import type { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'

import { isQRCodeFormat, mapZXingFormatToBWIPJS } from './barcode'

// Everything that needs bwip-js (about 900 kB), kept apart from the rest of the barcode utilities so
// the card list doesn't need it. Load it with useBarcodeRendering or loadBarcodeRendering.

/**
 * Adjusts a stored value to what bwip-js needs to draw it. Codabar must start and end with A, B, C
 * or D, which many scanners leave out, so they're added (as A) when missing. The stored value is
 * left as scanned.
 *
 * @param {string} bcid - The bwip-js encoder, e.g. 'rationalizedCodabar'.
 * @param {string} value - The stored value.
 * @returns {string} The text to encode.
 */
function toEncodableText(bcid: string, value: string): string {
  if (bcid === 'rationalizedCodabar' && !/^[A-D].*[A-D]$/i.test(value)) return `A${value}A`
  return value
}

/**
 * Checks whether a value can be encoded in the given format.
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The format to encode the value in.
 * @param {string} value - The value to encode.
 * @returns {string | undefined} Why the value doesn't fit the format, or undefined if it does.
 */
export function validateBarcodeValue(
  format: BarcodeFormat | QRCodeFormat,
  value: string,
): string | undefined {
  try {
    const bcid = mapZXingFormatToBWIPJS(format)
    toSVG({ bcid, text: toEncodableText(bcid, value) })
    return undefined
  } catch (err) {
    // bwip-js errors look like "bwipp.ean13badLength#6878: EAN-13 must be 12 or 13 digits".
    return String((err as Error).message ?? err).replace(/^bwipp\.\w+(#\d+)?: /, '')
  }
}

/** The narrowest width a card's barcode is shown at, in CSS pixels. */
const MIN_DISPLAY_WIDTH = 320

/**
 * Checks whether a value can be shown in the given format so that a scanner can read it off a phone
 * screen: it must fit the format, and a barcode's bars must be at least one CSS pixel wide. A long
 * URL fits Code 128, but its bars would be far too thin.
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The format to show the value in.
 * @param {string} value - The value.
 * @returns {boolean} Whether the code would be legible.
 */
export function canDisplayLegibly(format: BarcodeFormat | QRCodeFormat, value: string): boolean {
  if (validateBarcodeValue(format, value) !== undefined) return false
  if (isQRCodeFormat(format)) return true

  const bcid = mapZXingFormatToBWIPJS(format)
  // At scale 1 every bar is a whole number of pixels, so the width is the narrowest it can be drawn.
  const svg = toSVG({ bcid, text: toEncodableText(bcid, value), padding: 4 })
  const width = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)?.[1])
  // An unreadable width (NaN) counts as legible rather than hiding a code that may work.
  return !(width > MIN_DISPLAY_WIDTH)
}

/** bwip-js sizes in millimetres at 72 dpi. */
const PX_PER_MM = 72 / 25.4

/** Height of a linear barcode's bars, in CSS pixels. */
const BARCODE_BAR_HEIGHT = 64

/**
 * Picks the largest whole scale at which a code still fits the target width. Whole scales keep every
 * module a whole number of pixels wide, so the bars stay sharp.
 *
 * @param {number} naturalWidth - The code's width in pixels at scale 1.
 * @param {number} targetWidth - The width available, in device pixels.
 * @returns {number} The scale to draw at, at least 1.
 */
export function getBarcodeScale(naturalWidth: number, targetWidth: number): number {
  return Math.max(1, Math.floor(targetWidth / naturalWidth))
}

type RenderBarcodeOptions = {
  element: HTMLCanvasElement
  value: string
  format: string
  isQRCode: boolean
  width?: number
  pixelRatio?: number
}

/** * Renders a barcode or QR code onto a given HTML canvas element using the bwip-js library.
 *
 * The code is drawn in device pixels and the canvas is sized back down with CSS, so it stays sharp
 * on high-DPI screens.
 *
 * @param {RenderBarcodeOptions} options - The options for rendering the barcode.
 * @param {HTMLCanvasElement} options.element - The canvas element where the barcode will be rendered.
 * @param {string} options.value - The value to encode in the barcode.
 * @param {string} options.format - The format of the barcode (e.g., 'code128', 'qrcode').
 * @param {boolean} options.isQRCode - A flag indicating whether the format is a QR code.
 * @param {number} [options.width] - The width available for the code, in CSS pixels.
 * @param {number} [options.pixelRatio] - Device pixels per CSS pixel, usually `devicePixelRatio`.
 */
export function renderBarcode({
  element,
  value,
  format,
  isQRCode,
  width = isQRCode ? 160 : 320,
  pixelRatio = 1,
}: RenderBarcodeOptions): void {
  const options = {
    bcid: format,
    text: toEncodableText(format, value),
    backgroundcolor: 'FFFFFF',
    padding: 4,
  }

  // Draw once to measure the code's natural width, then again at the scale that fills the width.
  toCanvas(element, { ...options, scale: 1 })
  const scale = getBarcodeScale(element.width, width * pixelRatio)
  toCanvas(element, {
    ...options,
    scale,
    ...(isQRCode ? {} : { height: (BARCODE_BAR_HEIGHT * pixelRatio) / (scale * PX_PER_MM) }),
  })

  element.style.width = `${element.width / pixelRatio}px`
}
