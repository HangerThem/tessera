import { computed, effect, signal } from '@preact/signals'

import type { Card } from './types/Card.type'

import {
  deleteCards as deleteCardsFromDB,
  getCards,
  saveCard as saveCardToDB,
  updateCard,
} from './cards'

export const cards = signal<Card[]>([])
export const activeCardId = signal<string | null>(null)
export const isAddCardFormVisible = signal(false)

export const activeCard = computed(
  () => cards.value.find((c) => c.id === activeCardId.value) ?? null,
)

let wakeLock: WakeLockSentinel | null = null

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen')
  } catch (err) {
    console.error('Wake lock failed:', err)
  }
}

function releaseWakeLock() {
  wakeLock?.release()
  wakeLock = null
}

// Tie wake lock lifecycle to activeCardId
effect(() => {
  if (activeCardId.value !== null) {
    requestWakeLock()
  } else {
    releaseWakeLock()
  }
})

// Re-acquire if tab becomes visible while a card is open
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeCardId.value !== null) {
    requestWakeLock()
  }
})

/** Reloads cards from storage. */
export async function refreshCards(): Promise<void> {
  cards.value = await getCards()
}

/** Persists a new card and refreshes the list. */
export async function saveCard(card: Card): Promise<void> {
  isAddCardFormVisible.value = false
  activeCardId.value = null
  await saveCardToDB(card)
  await refreshCards()
}

/** Deletes cards by id and refreshes the list. */
export async function deleteCards(ids: string[]): Promise<void> {
  await deleteCardsFromDB(ids)
  await refreshCards()
}

/**
 * Toggles a card's favorite status in-memory first for instant UI feedback,
 * then persists in the background.
 */
export async function favoriteCard(id: string): Promise<void> {
  const card = cards.value.find((c) => c.id === id)
  if (!card) return

  cards.value = cards.value.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
  await updateCard(id, { isFavorite: !card.isFavorite })
}

/** Returns cards matching query against name and barcode value. */
export function searchCards(query: string): Card[] {
  const q = query.toLowerCase()
  return cards.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.barcodeValue.toLowerCase().includes(q),
  )
}

await refreshCards()
