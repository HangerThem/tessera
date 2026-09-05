import type { Card } from './types/Card.type'

import { deleteCards, getCards, saveCard, updateCard } from './cards'

let wakeLock: WakeLockSentinel | null = null

/** Prevents the screen from sleeping while a card is active. */
async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen')
  } catch (err) {
    console.error('Wake lock failed:', err)
  }
}

/** Releases the wake lock when no card is active. */
function releaseWakeLock() {
  wakeLock?.release()
  wakeLock = null
}

/**
 * Pub/sub channels for state updates.
 * - `'cards'`               — the full card list changed (add/delete/refresh)
 * - `'activeCard'`          — the active card id changed
 * - `'isAddCardFormVisible'`— the add-card form was opened or closed
 * - `` `card:${string}` ``  — a specific card's data changed (e.g. favorite toggle)
 */
type Channel = 'cards' | 'activeCard' | 'isAddCardFormVisible' | `card:${string}`

class State {
  private _cards: Card[] = []
  private _activeCardId: string | null = null
  private _isAddCardFormVisible: boolean = false
  private listeners = new Map<Channel, Set<() => void>>()

  /**
   * Subscribe to a channel. Returns an unsubscribe function — call it on
   * component teardown to avoid memory leaks and stale callbacks.
   *
   * @example
   * const unsub = state.subscribe(`card:${id}`, () => { ... })
   * // later:
   * unsub()
   */
  public subscribe(channel: Channel, fn: () => void): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set())
    this.listeners.get(channel)!.add(fn)
    return () => this.listeners.get(channel)!.delete(fn)
  }

  private notify(channel: Channel) {
    this.listeners.get(channel)?.forEach((fn) => fn())
  }

  public get activeCardId(): string | null {
    return this._activeCardId
  }

  /**
   * Setting an id acquires a wake lock and notifies `'activeCard'` subscribers.
   * Setting `null` releases the wake lock.
   */
  public set activeCardId(id: string | null) {
    this._activeCardId = id
    id !== null ? requestWakeLock() : releaseWakeLock()
    this.notify('activeCard')
  }

  public get isAddCardFormVisible(): boolean {
    return this._isAddCardFormVisible
  }

  /**
   * Opening the form clears the active card.
   * Notifies `'isAddCardFormVisible'` subscribers.
   */
  public set isAddCardFormVisible(visible: boolean) {
    this._isAddCardFormVisible = visible
    this.activeCardId = null
    this.notify('isAddCardFormVisible')
  }

  public get cards(): Card[] {
    return this._cards
  }

  /** Reloads cards from storage and notifies `'cards'` subscribers. */
  public refreshCards = async (): Promise<void> => {
    this._cards = await getCards()
    this.notify('cards')
  }

  /** Persists a new card, then refreshes the list. */
  public saveCard = async (card: Card): Promise<void> => {
    this._isAddCardFormVisible = false
    await saveCard(card)
    await this.refreshCards()
  }

  /** Deletes cards by id, then refreshes the list. */
  public deleteCards = async (ids: string[]): Promise<void> => {
    await deleteCards(ids)
    await this.refreshCards()
  }

  /**
   * Toggles a card's favorite status.
   *
   * Mutates the in-memory card and notifies only `` `card:${id}` `` subscribers,
   * so unrelated UI (e.g. the card list) is not re-rendered. Persists in the
   * background after notifying.
   */
  public favoriteCard = async (id: string): Promise<void> => {
    const card = this._cards.find((c) => c.id === id)
    if (!card) return

    card.isFavorite = !card.isFavorite
    this.notify(`card:${id}`)
    await updateCard(id, { isFavorite: card.isFavorite })
  }

  /** Returns cards whose name or barcode value match `query` (case-insensitive). */
  public searchCards(query: string): Card[] {
    const lowerQuery = query.toLowerCase()
    return this._cards.filter(
      (card) =>
        card.name.toLowerCase().includes(lowerQuery) ||
        card.barcodeValue.toLowerCase().includes(lowerQuery),
    )
  }
}

// Re-acquire the wake lock if the tab becomes visible while a card is open
// (the lock is automatically released by the browser on visibility loss).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.activeCardId !== null) {
    requestWakeLock()
  }
})

const state = new State()
await state.refreshCards()
export default state