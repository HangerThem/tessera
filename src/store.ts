import { computed, effect, signal } from '@preact/signals'

import type { Card } from './types/Card.type'

import {
  deleteCards as deleteCardsFromDB,
  getCards,
  migrateCardFormats,
  migrateIfNeeded,
  resetCardStore,
  saveCard as saveCardToDB,
  updateCard,
} from './cards'
import { deletePhoto, savePhoto } from './photos'
import { requestPersistentStorage } from './utils/install'

/** A new photo for a card, null to remove it, or undefined to leave it as it is. */
export type PhotoChange = Blob | null | undefined

/** Changes whenever a photo is saved, removed or imported, so views showing photos reload them. */
export const photoRevision = signal(0)

async function applyPhotoChange(cardId: string, photo: PhotoChange): Promise<void> {
  if (photo === undefined) return
  if (photo === null) await deletePhoto(cardId)
  else await savePhoto(cardId, photo)
  photoRevision.value++
}

export const cards = signal<Card[]>([])
export const activeCardId = signal<string | null>(null)
export const isAddCardFormVisible = signal(false)
export const editCardId = signal<string | null>(null)
export const isDeleteConfirmVisible = signal(false)
export const isBackupVisible = signal(false)
export type SortOrder = 'name' | 'recent'

const SORT_ORDER_KEY = 'tessera.sortOrder'

function readSortOrder(): SortOrder {
  try {
    return localStorage.getItem(SORT_ORDER_KEY) === 'recent' ? 'recent' : 'name'
  } catch {
    return 'name'
  }
}

/** How the card list is sorted, remembered on this device. Favourites always come first. */
export const sortOrder = signal<SortOrder>(readSortOrder())

effect(() => {
  try {
    localStorage.setItem(SORT_ORDER_KEY, sortOrder.value)
  } catch {
    // Blocked storage: the choice lasts until the app is closed.
  }
})

/** Whether the cards have been read from storage yet. */
export const loadState = signal<'loading' | 'ready' | 'failed'>('loading')

export const activeCard = computed(
  () => cards.value.find((c) => c.id === activeCardId.value) ?? null,
)

/** Whether any screen is open on top of the card list. */
export const isAnyScreenOpen = computed(
  () =>
    activeCardId.value !== null ||
    editCardId.value !== null ||
    isAddCardFormVisible.value ||
    isBackupVisible.value,
)

/**
 * Closes the topmost open screen: the delete confirmation, then the edit form, then the card
 * detail, add form or backup screen.
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
  } else if (isBackupVisible.value) {
    isBackupVisible.value = false
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

// Record when each card is opened, for sorting by recently used.
effect(() => {
  const id = activeCardId.value
  if (id !== null) void markCardUsed(id)
})

async function markCardUsed(id: string): Promise<void> {
  const lastUsedAt = Date.now()
  // peek, so the effect above doesn't re-run when the cards change.
  cards.value = cards.peek().map((c) => (c.id === id ? { ...c, lastUsedAt } : c))
  try {
    await updateCard(id, { lastUsedAt })
  } catch (err) {
    console.error('Recording card use failed:', err)
  }
}

// Re-acquire if tab becomes visible while a card is open
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeCardId.value !== null) {
    requestWakeLock()
  }
})

/** Reloads cards from storage. */
export async function refreshCards(): Promise<void> {
  cards.value = await getCards()
  // Asked once there are cards to lose, so the browser doesn't clear them under storage pressure.
  if (cards.value.length > 0) void requestPersistentStorage()
}

/**
 * Persists a new card and refreshes the list. The form is closed only once the card is stored, so
 * a failed write rejects with the form still open and nothing typed is lost.
 */
export async function saveCard(card: Card, photo?: PhotoChange): Promise<void> {
  await saveCardToDB(card)
  await applyPhotoChange(card.id, photo)
  isAddCardFormVisible.value = false
  editCardId.value = null
  activeCardId.value = null
  await refreshCards()
}

/**
 * Saves an edited card in place of the stored one and refreshes the list. The whole card is
 * replaced, so a field removed in the form, like a cleared note, stays removed. Like `saveCard`,
 * the form stays open if the write fails.
 */
export async function updateCardById(id: string, card: Card, photo?: PhotoChange): Promise<void> {
  await saveCardToDB({ ...card, id })
  await applyPhotoChange(id, photo)
  editCardId.value = null
  await refreshCards()
  // After saving, so recording the use can't write the old card back over the edit.
  activeCardId.value = id
}

/**
 * Deletes a card and its photo, and refreshes the list. The confirmation and the card are closed
 * only once the card is deleted, so a failed delete rejects with them still open.
 */
export async function deleteCard(id: string): Promise<void> {
  await deleteCardsFromDB([id])
  await deletePhoto(id)
  if (activeCardId.value === id) {
    activeCardId.value = null
  }
  isDeleteConfirmVisible.value = false
  await refreshCards()
}

/**
 * Adds imported cards that aren't on the device yet, with their photos. Cards that are already here,
 * matched by id, are kept as they are along with their photos, so an import never overwrites
 * anything.
 *
 * @returns How many cards were added, and how many were skipped because they were already here.
 */
export async function importCards(
  imported: Card[],
  photos: Record<string, Blob> = {},
): Promise<{ added: number; skipped: number }> {
  const existingIds = new Set(cards.value.map((c) => c.id))
  const toAdd = new Map<string, Card>()
  for (const card of imported) {
    if (!existingIds.has(card.id)) toAdd.set(card.id, card)
  }

  await Promise.all(
    [...toAdd.values()].map(async (card) => {
      await saveCardToDB(card)
      if (photos[card.id]) await savePhoto(card.id, photos[card.id])
    }),
  )
  if (Object.keys(photos).length > 0) photoRevision.value++
  await refreshCards()
  return { added: toAdd.size, skipped: imported.length - toAdd.size }
}

/**
 * Toggles a card's favorite status in-memory first for instant UI feedback,
 * then persists in the background. If that fails, the star is set back, so the list never shows a
 * state that isn't stored.
 */
export async function favoriteCard(id: string): Promise<void> {
  const card = cards.value.find((c) => c.id === id)
  if (!card) return

  const setFavorite = (isFavorite: boolean) =>
    (cards.value = cards.value.map((c) => (c.id === id ? { ...c, isFavorite } : c)))
  setFavorite(!card.isFavorite)
  try {
    await updateCard(id, { isFavorite: !card.isFavorite })
  } catch (err) {
    console.error('Saving the favourite failed:', err)
    setFavorite(card.isFavorite)
  }
}

/**
 * Reads the cards from storage, migrating old data first. Storage can fail to open, e.g. in some
 * private browsing modes or with a damaged database, which sets `loadState` to "failed" instead of
 * throwing, so the app can explain and offer to try again.
 */
export async function loadCards(): Promise<void> {
  loadState.value = 'loading'
  try {
    await migrateIfNeeded()
    await migrateCardFormats()
    await refreshCards()
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading cards failed:', err)
    resetCardStore()
    loadState.value = 'failed'
  }
}
