import type { Card, LegacyCard } from './types/Card.type'

export const isLegacyCard = (card: Card | LegacyCard): card is LegacyCard => !('format' in card)

/**
 * Converts a card stored before cards had a single format. The barcode format is kept: old cards
 * didn't record whether they were scanned from a QR code, and they've been shown as barcodes so far.
 */
export function fromLegacyCard(legacy: LegacyCard): Card {
  const { barcodeFormat, ...card } = legacy
  delete card.qrCodeFormat
  return { ...card, format: barcodeFormat }
}
