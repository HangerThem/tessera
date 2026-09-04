import type { BarcodeFormat } from '../enums/barcode'

export type Card = {
  id: string
  name: string
  barcodeValue: string
  barcodeFormat: BarcodeFormat
  color?: string
}
