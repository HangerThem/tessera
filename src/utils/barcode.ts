import { toCanvas, toSVG } from 'bwip-js/browser'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { hashString } from './hash'
import { createPRNG } from './prng'

export const mapZXingFormatToBWIPJS = (format: BarcodeFormat | QRCodeFormat): string => {
  switch (format) {
    case QRCodeFormat.AZTEC:
      return 'azteccode'
    case BarcodeFormat.CODABAR:
      return 'rationalizedCodabar'
    case BarcodeFormat.CODE_39:
      return 'code39'
    case BarcodeFormat.CODE_93:
      return 'code93'
    case BarcodeFormat.CODE_128:
      return 'code128'
    case QRCodeFormat.DATA_MATRIX:
      return 'datamatrix'
    case BarcodeFormat.EAN_8:
      return 'ean8'
    case BarcodeFormat.EAN_13:
      return 'ean13'
    case BarcodeFormat.ITF:
      return 'interleaved2of5'
    case QRCodeFormat.MAXICODE:
      return 'maxicode'
    case BarcodeFormat.PDF_417:
      return 'pdf417'
    case QRCodeFormat.QR_CODE:
      return 'qrcode'
    case QRCodeFormat.MICRO_QR_CODE:
      return 'microqrcode'
    case BarcodeFormat.UPC_A:
      return 'upca'
    case BarcodeFormat.UPC_E:
      return 'upce'
    default:
      throw new Error(`Unsupported barcode format: ${format}`)
  }
}

/**
 * Maps an array of ZXing barcode formats to the corresponding BarcodeDetector formats.
 *
 * @param {Array<BarcodeFormat | QRCodeFormat>} formats - An array of ZXing barcode formats.
 * @returns {Array<string> | undefined} An array of corresponding BarcodeDetector formats, or undefined if no formats are provided.
 */
export const mapZXingFormatsToBarcodeDetectorFormats = (
  formats: (BarcodeFormat | QRCodeFormat)[],
): BarcodeDetectorOptions['formats'] => {
  if (formats.length === 0) return undefined

  const mapped: BarcodeDetectorOptions['formats'] = []
  for (const format of formats) {
    switch (format) {
      case BarcodeFormat.CODE_39:
        mapped.push('code_39')
        break
      case BarcodeFormat.CODE_93:
        mapped.push('code_93')
        break
      case BarcodeFormat.CODE_128:
        mapped.push('code_128')
        break
      case BarcodeFormat.EAN_8:
        mapped.push('ean_8')
        break
      case BarcodeFormat.EAN_13:
        mapped.push('ean_13')
        break
      case BarcodeFormat.ITF:
        mapped.push('itf')
        break
      case BarcodeFormat.PDF_417:
        mapped.push('pdf417')
        break
      case BarcodeFormat.UPC_A:
        mapped.push('upc_a')
        break
      case BarcodeFormat.UPC_E:
        mapped.push('upc_e')
        break
      case BarcodeFormat.CODABAR:
        mapped.push('codabar')
        break
      case QRCodeFormat.AZTEC:
        mapped.push('aztec')
        break
      case QRCodeFormat.DATA_MATRIX:
        mapped.push('data_matrix')
        break
      case QRCodeFormat.QR_CODE:
        mapped.push('qr_code')
        break
      case QRCodeFormat.MICRO_QR_CODE:
        mapped.push('micro_qr_code')
        break
      case QRCodeFormat.MAXICODE:
        mapped.push('maxi_code')
        break
    }
  }

  return mapped.length > 0 ? mapped : undefined
}

/**
 * Maps a BarcodeDetector format back to the corresponding ZXing barcode format.
 *
 * @param {string} format - A BarcodeDetector format, e.g. 'qr_code'.
 * @returns {BarcodeFormat | QRCodeFormat | undefined} The corresponding ZXing format, or undefined if it is not supported.
 */
export const mapBarcodeDetectorFormatToZXing = (
  format: string,
): BarcodeFormat | QRCodeFormat | undefined =>
  [...Object.values(BarcodeFormat), ...Object.values(QRCodeFormat)]
    .filter(
      (zxingFormat): zxingFormat is BarcodeFormat | QRCodeFormat => typeof zxingFormat === 'number',
    )
    .find((zxingFormat) => mapZXingFormatsToBarcodeDetectorFormats([zxingFormat])?.[0] === format)

const FORMAT_LABELS: Record<BarcodeFormat | QRCodeFormat, string> = {
  [BarcodeFormat.CODABAR]: 'Codabar',
  [BarcodeFormat.CODE_39]: 'Code 39',
  [BarcodeFormat.CODE_93]: 'Code 93',
  [BarcodeFormat.CODE_128]: 'Code 128',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.ITF]: 'ITF',
  [BarcodeFormat.PDF_417]: 'PDF417',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
  [QRCodeFormat.AZTEC]: 'Aztec',
  [QRCodeFormat.DATA_MATRIX]: 'Data Matrix',
  [QRCodeFormat.QR_CODE]: 'QR code',
  [QRCodeFormat.MICRO_QR_CODE]: 'Micro QR code',
  [QRCodeFormat.MAXICODE]: 'MaxiCode',
}

/**
 * The name of a format as printed on cards and scanners, e.g. "EAN-13".
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The format.
 * @returns {string} The format's name.
 */
export function formatLabel(format: BarcodeFormat | QRCodeFormat): string {
  return FORMAT_LABELS[format]
}

/** Formats in the order they're offered: barcodes, then 2D codes. */
export const BARCODE_FORMATS = Object.values(BarcodeFormat).filter(
  (format): format is BarcodeFormat => typeof format === 'number',
)
export const QR_CODE_FORMATS = Object.values(QRCodeFormat).filter(
  (format): format is QRCodeFormat => typeof format === 'number',
)

/** * Determines if the given format is a QR code format.
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The barcode format to check.
 * @returns {boolean} True if the format is a QR code format, false otherwise.
 */
export function isQRCodeFormat(format: BarcodeFormat | QRCodeFormat): boolean {
  return Object.values(QRCodeFormat).includes(format as QRCodeFormat)
}

type GenerateDecorativeBarsOptions = {
  count?: number
  seed?: number | string
}

type DecorativeBar = {
  width: number
  height: number
}

/**
 * Generates an array of decorative bars with random widths and heights.
 * The widths are chosen from a predefined set of values, and the heights are random values between 0.6 and 1.0.
 * If a seed is provided, the random number generator will produce a deterministic sequence of bars.
 *
 * @param {GenerateDecorativeBarsOptions} options - Options for generating decorative bars.
 * @returns {DecorativeBar[]} An array of decorative bars with specified count, widths, and heights.
 */
export function generateDecorativeBars({
  count = 40,
  seed,
}: GenerateDecorativeBarsOptions): DecorativeBar[] {
  const seedValue = typeof seed === 'string' ? hashString(seed) : seed
  const random = createPRNG(seedValue)

  const widths = [1, 1, 1, 2, 2, 3]

  return Array.from({ length: count }, () => ({
    width: widths[Math.floor(random() * widths.length)],
    height: 0.6 + random() * 0.4,
  }))
}

/**
 * Formats a barcode value based on its format.
 *
 * - For EAN-8, it groups the digits into two groups of four.
 * - For EAN-13, it groups the digits into three groups: one digit, six digits, and six digits.
 * - For ITF, it groups the digits into pairs of two.
 * - For UPC-A, it groups the digits as printed: one digit, five, five and the check digit.
 * - For other formats, it returns the value as is.
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The format of the barcode.
 * @param {string} value - The value of the barcode to be formatted.
 * @returns {string} The formatted barcode value.
 */
export function formatBarcodeValue(format: BarcodeFormat | QRCodeFormat, value: string): string {
  switch (format) {
    case BarcodeFormat.EAN_8:
      return value.replace(/^(\d{4})(\d{4})$/, '$1 $2')
    case BarcodeFormat.EAN_13:
      return value.replace(/^(\d{1})(\d{6})(\d{6})$/, '$1 $2 $3')
    case BarcodeFormat.ITF:
      return value.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
    case BarcodeFormat.UPC_A:
      return value.replace(/^(\d)(\d{5})(\d{5})(\d)$/, '$1 $2 $3 $4')
    default:
      return value
  }
}

const VISIBLE_LENGTH = 4

/** * Encodes a barcode value by masking all but the last four characters.
 * The masked characters are replaced with asterisks (*).
 *
 * @param {BarcodeFormat | QRCodeFormat} format - The format of the barcode.
 * @param {string} value - The value of the barcode to be encoded.
 * @returns {string} The encoded barcode value with masked characters.
 */
export function encodeBarcodeValue(format: BarcodeFormat | QRCodeFormat, value: string): string {
  const formattedValue = formatBarcodeValue(format, value)
  let visibleCount = 0

  return formattedValue
    .split('')
    .toReversed()
    .map((char) => {
      if (char === ' ') return char
      if (visibleCount < VISIBLE_LENGTH) {
        visibleCount += 1
        return char
      }
      return '*'
    })
    .toReversed()
    .join('')
}

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
