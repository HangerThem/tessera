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

  return (
    <li
      className="relative w-full max-h-55 shadow-[0_-10px_10px_-5px_rgba(0,0,0,0.25)]"
    >
      <button
        onClick={() => (activeCardId.value = card.id)}
        aria-label={`View details for ${card.name}`}
        className="flex flex-col gap-8 w-full text-left rounded-xl py-3 px-4 cursor-pointer overflow-hidden"
        style={{
          backgroundColor: card.color ?? '#fff',
          color: card.color ? contrastColor(card.color) : '#000',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{card.name}</h2>
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
      </button>

      <button
        onClick={() => favoriteCard(card.id)}
        aria-label={card.isFavorite ? 'Unmark as favorite' : 'Mark as favorite'}
        aria-pressed={card.isFavorite}
        className="absolute top-3 right-4 cursor-pointer"
      >
        <Star
          className={`w-5 h-5 ${card.color ? contrastColor(card.color) : 'text-black'} ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
          aria-hidden="true"
        />
      </button>
    </li>
  )
}