import type { Card } from '../types/Card.type'

import state from '../state'
import { CardItem } from './CardItem'

export function CardList(container: HTMLElement, cards: Card[] = state.cards) {
  container.innerHTML = ''
  cards.forEach((card, index) => {
    const el = CardItem(card, index)
    container.appendChild(el)
  })
  syncActiveCard(container)
}

export function syncActiveCard(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('.card').forEach((el) => {
    el.classList.toggle('expanded', el.dataset.cardId === state.activeCardId)
  })
}
