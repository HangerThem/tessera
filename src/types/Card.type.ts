import type { BarcodeFormat, CodeFormat, QRCodeFormat } from '../enums/codeFormats'

export type Card = {
  id: string
  name: string
  barcodeValue: string
  /** The format the card's code actually uses. */
  format: CodeFormat
  isFavorite: boolean
  color?: string
}

/**
 * How cards were stored before they had a single format: a barcode format and an optional QR code
 * format, without saying which one the card used.
 */
export type LegacyCard = Omit<Card, 'format'> & {
  barcodeFormat: BarcodeFormat
  qrCodeFormat?: QRCodeFormat
}
