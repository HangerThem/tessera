import { cards } from '../store'
import { CardItem } from './CardItem'

export function CardList() {
  return (
    <div class="relative space-y-3 mt-2">
      {cards.value.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  )
}
