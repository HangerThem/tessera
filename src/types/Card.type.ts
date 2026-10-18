import type { BarcodeFormat, CodeFormat, QRCodeFormat } from '../enums/codeFormats'

export type Card = {
  id: string
  name: string
  barcodeValue: string
  /** The format the card's code actually uses. */
  format: CodeFormat
  isFavorite: boolean
  color?: string
  /** A short note, e.g. a PIN or membership tier. Hidden at checkout until tapped. */
  note?: string
  /** When the card was last opened, in milliseconds since the epoch. Never opened if missing. */
  lastUsedAt?: number
}

/**
 * How cards were stored before they had a single format: a barcode format and an optional QR code
 * format, without saying which one the card used.
 */
export type LegacyCard = Omit<Card, 'format'> & {
  barcodeFormat: BarcodeFormat
  qrCodeFormat?: QRCodeFormat
}
