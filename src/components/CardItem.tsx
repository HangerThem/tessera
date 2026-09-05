import type { Card } from '../types/Card.type'

import { activeCardId, favoriteCard, deleteCards } from '../store'
import { RenderBarcode } from './BarcodeCanvas'
import { Star, Trash2 } from 'lucide-preact'

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
      <div class="card-header">
        <h2>{card.name}</h2>
      </div>
      <RenderBarcode value={card.barcodeValue} format={card.barcodeFormat} rotate={isActive} />
      <p class="barcode-value">{card.barcodeValue}</p>
      <div class="card-actions">
        <button
          class="card-btn favorite-btn"
          aria-label="Toggle favorite"
          aria-pressed={card.isFavorite}
          onClick={(e) => {
            e.stopPropagation()
            favoriteCard(card.id)
          }}
        >
          <Star class={`favorite-icon ${card.isFavorite ? 'active' : ''}`} />
        </button>
        {isActive && (
          <button
            class="card-btn delete-btn"
            aria-label="Delete card"
            onClick={(e) => {
              e.stopPropagation()
              deleteCards([card.id])
            }}
          >
            <Trash2 />
          </button>
        )}
      </div>
    </div>
  )
}
