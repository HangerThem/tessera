import { computed, effect, signal } from '@preact/signals'

import type { Card } from './types/Card.type'

import {
  deleteCards as deleteCardsFromDB,
  getCards,
  migrateIfNeeded,
  saveCard as saveCardToDB,
  updateCard,
} from './cards'

export const cards = signal<Card[]>([])
export const activeCardId = signal<string | null>(null)
export const isAddCardFormVisible = signal(false)
export const editCardId = signal<string | null>(null)
export const isDeleteConfirmVisible = signal(false)

export const activeCard = computed(
  () => cards.value.find((c) => c.id === activeCardId.value) ?? null,
)

/** Whether any screen is open on top of the card list. */
export const isAnyScreenOpen = computed(
  () => activeCardId.value !== null || editCardId.value !== null || isAddCardFormVisible.value,
)

/**
 * Closes the topmost open screen: the delete confirmation, then the edit form, then the card
 * detail or add form.
 *
 * @returns Whether a screen was closed.
 */
export function closeTopScreen(): boolean {
  if (isDeleteConfirmVisible.value) {
    isDeleteConfirmVisible.value = false
  } else if (editCardId.value !== null) {
    editCardId.value = null
  } else if (activeCardId.value !== null) {
    activeCardId.value = null
  } else if (isAddCardFormVisible.value) {
    isAddCardFormVisible.value = false
  } else {
    return false
  }
  return true
}

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
  editCardId.value = null
  activeCardId.value = null
  await saveCardToDB(card)
  await refreshCards()
}

/** Updates a card and refreshes the list. */
export async function updateCardById(id: string, data: Partial<Card>): Promise<void> {
  editCardId.value = null
  activeCardId.value = id
  await updateCard(id, data)
  await refreshCards()
}

/** Deletes a card and refreshes the list. */
export async function deleteCard(id: string): Promise<void> {
  if (activeCardId.value === id) {
    activeCardId.value = null
  }
  isDeleteConfirmVisible.value = false
  await deleteCardsFromDB([id])
  await refreshCards()
}

/**
 * Adds imported cards that aren't on the device yet. Cards that are already here, matched by id, are
 * kept as they are, so an import never overwrites anything.
 *
 * @returns How many cards were added, and how many were skipped because they were already here.
 */
export async function importCards(imported: Card[]): Promise<{ added: number; skipped: number }> {
  const existingIds = new Set(cards.value.map((c) => c.id))
  const toAdd = new Map<string, Card>()
  for (const card of imported) {
    if (!existingIds.has(card.id)) toAdd.set(card.id, card)
  }

  await Promise.all([...toAdd.values()].map((card) => saveCardToDB(card)))
  await refreshCards()
  return { added: toAdd.size, skipped: imported.length - toAdd.size }
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

await migrateIfNeeded()
await refreshCards()
