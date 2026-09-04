import { toCanvas } from 'bwip-js/browser'

import type { Card } from '../types/Card.type'

import { mapZXingFormatToBWIPJS } from '../utils/barcode'

export function renderBarcode(card: Card): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.className = 'barcode-canvas'
  try {
    toCanvas(canvas, {
      bcid: mapZXingFormatToBWIPJS(card.barcodeFormat),
      text: card.barcodeValue,
      height: 20,
      width: 100,
      padding: 4,
      backgroundcolor: '#ffffff',
    })
    return canvas
  } catch (error) {
    console.error('Error generating barcode:', error)
    return null
  }
}
