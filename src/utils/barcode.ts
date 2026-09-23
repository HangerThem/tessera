import { toCanvas } from 'bwip-js/browser'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { hashString } from './hash'
import { createPRNG } from './prng'

export const mapZXingFormatToBWIPJS = (format: BarcodeFormat | QRCodeFormat): string => {
  switch (format) {
    case QRCodeFormat.AZTEC:
      return 'azteccode'
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
    default:
      throw new Error(`Unsupported barcode format: ${format}`)
  }
}

/**
 * Maps an array of ZXing barcode formats to the corresponding BarcodeDetector formats.
 *
 * @param {Array<BarcodeFormat | QRCodeFormat>} formats - An array of ZXing barcode formats.
 * @returns {Array<string>} An array of corresponding BarcodeDetector formats.
 * @throws {Error} If an unsupported barcode format is encountered.
 */
export const mapZXingFormatsToBarcodeDetectorFormats = (formats: (BarcodeFormat | QRCodeFormat)[]): BarcodeDetectorOptions["formats"] => {
  return formats.map((format) => {
    switch (format) {
      case BarcodeFormat.CODE_39:
        return 'code_39'
      case BarcodeFormat.CODE_93:
        return 'code_93'
      case BarcodeFormat.CODE_128:
        return 'code_128'
      case BarcodeFormat.EAN_8:
        return 'ean_8'
      case BarcodeFormat.EAN_13:
        return 'ean_13'
      case BarcodeFormat.ITF:
        return 'itf'
      case BarcodeFormat.PDF_417:
        return 'pdf417'
      case QRCodeFormat.AZTEC:
        return 'aztec'
      case QRCodeFormat.DATA_MATRIX:
        return 'data_matrix'
      case QRCodeFormat.QR_CODE:
        return 'qr_code'
      case QRCodeFormat.MICRO_QR_CODE:
        return 'micro_qr_code'
      case QRCodeFormat.MAXICODE:
        return 'maxi_code'
      default:
        throw new Error(`Unsupported barcode format: ${format}`)
    }
  })
}

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

type RenderBarcodeOptions = {
  element: HTMLCanvasElement
  value: string
  format: string
  isQRCode: boolean
}

/** * Renders a barcode or QR code onto a given HTML canvas element using the bwip-js library.
 *
 * @param {RenderBarcodeOptions} options - The options for rendering the barcode.
 * @param {HTMLCanvasElement} options.element - The canvas element where the barcode will be rendered.
 * @param {string} options.value - The value to encode in the barcode.
 * @param {string} options.format - The format of the barcode (e.g., 'code128', 'qrcode').
 * @param {boolean} options.isQRCode - A flag indicating whether the format is a QR code.
 */
export function renderBarcode({ element, value, format, isQRCode }: RenderBarcodeOptions): void {
  const width = isQRCode ? 50 : 200
  const height = isQRCode ? 50 : 30

  element.width = width
  element.height = height

  toCanvas(element, {
    bcid: format,
    text: value,
    scale: 1,
    height: isQRCode ? 50 : 30,
    width: isQRCode ? 50 : 200,
    backgroundcolor: 'FFFFFF',
    padding: 4,
  })
}
