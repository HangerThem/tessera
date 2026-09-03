import { CardItem } from './CardItem'
import state from '../state'

export function CardList(container: HTMLElement) {
	container.innerHTML = ''
	state.cards.forEach((card, index) => {
		const el = CardItem(card, index)
		container.appendChild(el)
	})
	syncActiveCard(container)
}

export function syncActiveCard(container: HTMLElement) {
	container.querySelectorAll<HTMLElement>('.card').forEach(el => {
		el.classList.toggle('expanded', el.dataset.cardId === state.activeCardId)
	})
}