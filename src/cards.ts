import { createStore, del, get, getMany, keys, set, update } from 'idb-keyval'

import type { Card, LegacyCard } from './types/Card.type'

import { fromLegacyCard, isLegacyCard } from './legacyCard'

let store: ReturnType<typeof createStore> | undefined

/**
 * Opens the card store on first use rather than on import, so a browser that blocks IndexedDB
 * fails a call that can be caught instead of the whole app's import.
 */
function cardStore() {
  store ??= createStore('tessera', 'cards')
  return store
}

/** Forgets a store that failed to open, so the next call tries to open it again. */
export function resetCardStore(): void {
  store = undefined
}

export async function getCards(): Promise<Card[]> {
  const allKeys = await keys<string>(cardStore())
  const allCards = await getMany<Card>(allKeys, cardStore())
  return allCards.filter((c): c is Card => c !== undefined)
}

export async function saveCard(card: Card): Promise<void> {
  await set(card.id, card, cardStore())
}

export async function updateCard(cardId: string, data: Partial<Omit<Card, 'id'>>): Promise<void> {
  await update<Card>(
    cardId,
    (existing) => {
      if (!existing) throw new Error(`Card not found: ${cardId}`)
      return { ...existing, ...data }
    },
    cardStore(),
  )
}

export async function deleteCard(id: string): Promise<void> {
  await del(id, cardStore())
}

export async function deleteCards(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => del(id, cardStore())))
}

/** Rewrites cards stored with a barcode and a QR code format to have a single format. */
export async function migrateCardFormats(): Promise<void> {
  const allKeys = await keys<string>(cardStore())
  const stored = await getMany<Card | LegacyCard | undefined>(allKeys, cardStore())
  await Promise.all(
    stored.map((card) =>
      card && isLegacyCard(card) ? set(card.id, fromLegacyCard(card), cardStore()) : undefined,
    ),
  )
}

export async function migrateIfNeeded(): Promise<void> {
  try {
    const raw = await get('cards')
    if (!Array.isArray(raw) || raw.length === 0 || typeof raw[0] !== 'object') return
    await Promise.all((raw as Card[]).map((c) => set(c.id, c, cardStore())))
    await del('cards')
  } catch (error) {
    console.warn((error as Error).message)
  }
}
