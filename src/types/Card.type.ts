import type { BarcodeFormat } from "@zxing/library"

export type Card = {
	id: string
	name: string
	barcodeValue: string
	barcodeFormat: BarcodeFormat
	color?: string
}