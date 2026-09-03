import bwipjs from 'bwip-js/browser'
import type { Card } from '../types/Card.type'
import { mapZXingFormatToBWIPJS } from '../utils/barcode'
import state from '../state'

export function renderBarcode(card: Card): HTMLCanvasElement | null {
	console.log(state.cards)
	const canvas = document.createElement('canvas')
	canvas.className = 'barcode-canvas'
	try {
		bwipjs.toCanvas(canvas, {
			bcid: mapZXingFormatToBWIPJS(card.barcodeFormat), text: card.barcodeValue,
			height: 20,
			width: 100,
			padding: 4, backgroundcolor: '#ffffff'
		})
		return canvas
	} catch (error) {
		console.error('Error generating barcode:', error)
		return null
	}
}