import { cards } from '../store'
import { CardItem } from './CardItem'

export function CardList() {
  return (
    <div class="cards-container">
      {cards.value.map((card, index) => (
        <CardItem key={card.id} card={card} index={index} />
      ))}
    </div>
  )
}
