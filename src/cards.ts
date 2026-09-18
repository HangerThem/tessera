import { del, get, set, update } from 'idb-keyval'

import type { Card } from './types/Card.type'

const CARDS_KEY = 'cards'
const cardKey = (id: string) => `card:${id}` as const

export async function getCards(): Promise<Card[]> {
  const ids = (await get<string[]>(CARDS_KEY)) ?? []
  const cards = await Promise.all(ids.map((id) => get<Card>(cardKey(id))))
  return cards.filter((c): c is Card => c !== undefined)
}

export async function saveCard(card: Card): Promise<void> {
  const ids = (await get<string[]>(CARDS_KEY)) ?? []
  await Promise.all([
    set(CARDS_KEY, [...ids, card.id]),
    set(cardKey(card.id), card),
  ])
}

export async function updateCard(cardId: string, data: Partial<Omit<Card, 'id'>>): Promise<void> {
  await update<Card>(cardKey(cardId), (existing) => {
    if (!existing) throw new Error(`Card not found: ${cardId}`)
    return { ...existing, ...data }
  })
}

export async function deleteCard(id: string): Promise<void> {
  const ids = (await get<string[]>(CARDS_KEY)) ?? []
  await Promise.all([
    set(CARDS_KEY, ids.filter((i) => i !== id)),
    del(cardKey(id)),
  ])
}

export async function deleteCards(ids: string[]): Promise<void> {
  const idSet = new Set(ids)
  const allIds = (await get<string[]>(CARDS_KEY)) ?? []
  await Promise.all([
    set(CARDS_KEY, allIds.filter((i) => !idSet.has(i))),
    ...ids.map((id) => del(cardKey(id))),
  ])
}

export async function migrateIfNeeded(): Promise<void> {
  const raw = await get(CARDS_KEY)
  if (!Array.isArray(raw) || raw.length === 0 || typeof raw[0] !== 'object') return
  const oldCards = raw as Card[]
  await Promise.all([
    set(CARDS_KEY, oldCards.map((c) => c.id)),
    ...oldCards.map((c) => set(cardKey(c.id), c)),
  ])
}