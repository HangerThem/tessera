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
