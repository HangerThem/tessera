import { tv } from "tailwind-variants"

import type { Card } from '../types/Card.type'

import { activeCardId } from '../store'
import { RenderBarcode } from './BarcodeCanvas'
import { contrastColor } from '../utils/color'


interface Props {
  card: Card
  index: number
}

const cardStyles = tv({
  base: 'absolute w-full max-h-55 rounded-xl p-4 cursor-pointer overflow-hidden flex flex-col gap-2 shadow-[0_-10px_10px_-5px_rgba(0,0,0,0.25)] [transform:translateY(calc(var(--index)*48px))]',
  variants: {
    expanded: {
      true: 'z-[999] fixed inset-0 w-full h-full rounded-none max-h-none gap-4 [transform:none]',
    },
  },
})

export function CardItem({ card, index }: Props) {
  const isActive = activeCardId.value === card.id

  return (
    <div
      className={cardStyles({ expanded: isActive })}
      style={{
        backgroundColor: card.color ?? '#fff',
        color: card.color ? contrastColor(card.color) : '#000',
        '--index': index,
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        activeCardId.value = activeCardId.value === card.id ? null : card.id
      }}
    >
      <h2 className="text-lg font-bold">{card.name}</h2>
      <RenderBarcode value={card.barcodeValue} format={card.barcodeFormat} />
      <p
        className="text-sm text-center"
        style={{ color: card.color ? contrastColor(card.color) : '#000' }}
      >
        {card.barcodeValue}
      </p>
    </div>
  )
}
