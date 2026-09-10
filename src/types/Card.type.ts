import type { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'

export type Card = {
  id: string
  name: string
  barcodeValue: string
  barcodeFormat: BarcodeFormat
  qrCodeFormat?: QRCodeFormat
  isFavorite: boolean
  color?: string
}
