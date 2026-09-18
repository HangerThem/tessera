import { CreditCard, Star } from 'lucide-preact'

import type { Card } from '../types/Card.type'

import { activeCardId, favoriteCard } from '../store'
import { encodeBarcodeValue, generateDecorativeBars } from '../utils/barcode'
import { contrastColor } from '../utils/color'

interface Props {
  card: Card
}
export function CardItem({ card }: Props) {
  const decorativeBars = generateDecorativeBars({ count: 20, seed: card.id })

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activeCardId.value = card.id
    }
  }

  return (
    <div
      role="button"
      aria-label={`View details for ${card.name}`}
      tabIndex={0}
      className="'w-full max-h-55 rounded-xl py-3 px-4 cursor-pointer overflow-hidden flex flex-col gap-8 shadow-[0_-10px_10px_-5px_rgba(0,0,0,0.25)]"
      style={{
        backgroundColor: card.color ?? '#fff',
        color: card.color ? contrastColor(card.color) : '#000',
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        activeCardId.value = card.id
      }}
      onKeyDown={(e) => handleKeyDown(e)}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{card.name}</h2>
        <button
          onClick={() => favoriteCard(card.id)}
          className="cursor-pointer"
          aria-label={card.isFavorite ? 'Unmark as favorite' : 'Mark as favorite'}
          aria-pressed={card.isFavorite}
        >
          <Star
            className={`w-5 h-5 ${card.color ? contrastColor(card.color) : 'text-black'} ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p
          className="text-sm font-mono opacity-70"
          style={{ color: card.color ? contrastColor(card.color) : '#000' }}
          aria-label={`Card ending in ${card.barcodeValue.slice(-4)}`}
        >
          {encodeBarcodeValue(card.barcodeFormat, card.barcodeValue)}
        </p>
        <div className="flex gap-2 items-end justify-between" aria-hidden="true">
          <div className="flex gap-px items-end">
            {decorativeBars.map((bar) => (
              <div
                key={`${card.id}-${bar.width}-${bar.height}`}
                className="rounded-md"
                style={{
                  width: `${bar.width * 2}px`,
                  height: `${bar.height * 40}px`,
                  backgroundColor: card.color ? contrastColor(card.color) : '#000',
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
          <CreditCard className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
