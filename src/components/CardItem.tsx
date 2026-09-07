import { Star, Trash2 } from 'lucide-preact'

import type { Card } from '../types/Card.type'

import { activeCardId, favoriteCard, deleteCards } from '../store'
import { RenderBarcode } from './BarcodeCanvas'

interface Props {
  card: Card
  index: number
}

export function CardItem({ card, index }: Props) {
  const isActive = activeCardId.value === card.id

  return (
    <div
      class={`card ${isActive ? 'expanded' : ''}`}
      data-card-id={card.id}
      style={{
        backgroundColor: card.color ?? '#fff',
        '--card-color': card.color ?? '#fff',
        '--index': index,
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        activeCardId.value = activeCardId.value === card.id ? null : card.id
      }}
    >
      <h2>{card.name}</h2>
      <RenderBarcode value={card.barcodeValue} format={card.barcodeFormat} />
      <p class="barcode-value">{card.barcodeValue}</p>
    </div>
  )
}
