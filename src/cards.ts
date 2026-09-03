import { get, set, update } from 'idb-keyval'
import type { Card } from './types/Card.type'

const CARDS_KEY = 'cards'

export async function getCards(): Promise<Card[]> {
	return (await get(CARDS_KEY)) ?? []
}

export async function saveCard(card: Card) {
	const cards = await getCards()
	await set(CARDS_KEY, [...cards, card])
}

export async function updateCard(card: Partial<Card> & { id: string }) {
	await update(CARDS_KEY, (cards: Card[] | undefined) => {
		if (!cards) return [card as Card]
		return cards.map(c => (c.id === card.id ? { ...c, ...card } : c))
	})
}

export async function deleteCard(id: string): Promise<void> {
	const cards = (await get<Card[]>(CARDS_KEY)) ?? []
	await set(CARDS_KEY, cards.filter(c => c.id !== id))
}

export async function deleteCards(ids: string[]): Promise<void> {
	const idSet = new Set(ids)
	const cards = (await get<Card[]>(CARDS_KEY)) ?? []
	await set(CARDS_KEY, cards.filter(c => !idSet.has(c.id)))
}