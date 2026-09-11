import { QrCodeIcon, Star } from 'lucide-preact'

import type { Card } from '../types/Card.type'

import { favoriteCard } from '../store'
import { encodeBarcodeValue, generateDecorativeBars } from '../utils/barcode'
import { contrastColor } from '../utils/color'

interface ActiveCardProps {
  card: Card
}

export function ActiveCard({ card }: ActiveCardProps) {
  const decorativeBars = generateDecorativeBars({ count: 20, seed: card.id })

  return (
    <div
      className="z-999 cursor-pointer fixed inset-0 py-3 px-4 overflow-hidden flex flex-col gap-8"
      style={{
        backgroundColor: card.color ?? '#fff',
        color: card.color ? contrastColor(card.color) : '#000',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{card.name}</h2>
        <button onClick={() => favoriteCard(card.id)} className="cursor-pointer">
          <Star
            className={`w-5 h-5 ${card.color ? contrastColor(card.color) : 'text-black'} ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
          />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: card.color ? contrastColor(card.color) : '#000' }}>
          {encodeBarcodeValue(card.barcodeFormat, card.barcodeValue)}
        </p>
        <div className="flex gap-2 items-end justify-between">
          <div className="flex gap-px items-end">
            {decorativeBars.map((bar, i) => (
              <div
                key={i}
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
          <button>
            <QrCodeIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
