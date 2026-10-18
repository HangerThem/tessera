import { useMemo } from 'preact/hooks'

import type { Card } from '../types/Card.type'

import { CardItem } from './CardItem'

export type SortOrder = 'name' | 'recent'

interface Props {
  cards: Card[]
  /** Favourites always come first. Defaults to sorting by name. */
  sortOrder?: SortOrder
}

const byName = (a: Card, b: Card) => a.name.localeCompare(b.name)

/** Most recently opened first; cards never opened go last, by name. */
function byRecentUse(a: Card, b: Card) {
  if (a.lastUsedAt === undefined && b.lastUsedAt === undefined) return byName(a, b)
  return (b.lastUsedAt ?? -Infinity) - (a.lastUsedAt ?? -Infinity)
}

export function CardList({ cards, sortOrder = 'name' }: Props) {
  const sortedCards = useMemo(
    () =>
      cards.toSorted((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return sortOrder === 'recent' ? byRecentUse(a, b) : byName(a, b)
      }),
    [cards, sortOrder],
  )

  return (
    <ul class="relative space-y-3 mt-2">
      {sortedCards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </ul>
  )
}
