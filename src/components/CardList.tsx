import { useEffect, useState } from 'preact/hooks'
import type { Card } from '../types/Card.type'

import { CardItem } from './CardItem'

export function CardList({ cards }: { cards: Card[] }) {
  const [sortedCards, setSortedCards] = useState<Card[]>([])

  useEffect(() => {
    const sorted = cards.toSorted((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return a.name.localeCompare(b.name)
    })
    setSortedCards(sorted)
  }, [cards])

  return (
    <ul class="relative space-y-3 mt-2">
      {sortedCards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </ul>
  )
}
