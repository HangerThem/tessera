import { QrCodeIcon, Star } from 'lucide-preact'
import { tv } from 'tailwind-variants'

import type { Card } from '../types/Card.type'

import { activeCardId, favoriteCard } from '../store'
import { encodeBarcodeValue, generateDecorativeBars } from '../utils/barcode'
import { contrastColor } from '../utils/color'

interface Props {
  card: Card
  index: number
}

const cardStyles = tv({
  base: 'absolute w-full max-h-55 rounded-xl py-3 px-4 cursor-pointer overflow-hidden flex flex-col gap-8 shadow-[0_-10px_10px_-5px_rgba(0,0,0,0.25)]',
  variants: {
    expanded: {
      true: 'z-[999] fixed inset-0 w-full h-full rounded-none max-h-none gap-4 [transform:none]',
    },
  },
})

const CARD_OFFSET = 48

export function CardItem({ card, index }: Props) {
  const isActive = activeCardId.value === card.id
  const decorativeBars = generateDecorativeBars({ count: 20, seed: card.id })

  return (
    <div
      className={cardStyles({ expanded: isActive })}
      style={{
        backgroundColor: card.color ?? '#fff',
        color: card.color ? contrastColor(card.color) : '#000',
        ...(!isActive && {
          transform: `translateY(${index * CARD_OFFSET}px)`,
        }),
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        activeCardId.value = activeCardId.value === card.id ? null : card.id
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
