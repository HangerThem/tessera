import type { Card } from '../types/Card.type'

import { CardItem } from './CardItem'

export function CardList({ cards }: { cards: Card[] }) {
  return (
    <div class="relative space-y-3 mt-2">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  )
}
