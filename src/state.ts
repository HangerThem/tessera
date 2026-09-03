import { deleteCards, getCards, saveCard } from "./cards"
import type { Card } from "./types/Card.type"

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

type Channel = 'cards' | 'activeCard' | 'isAddCardFormVisible'

class State {
	private _cards: Card[] = []
	private _activeCardId: string | null = null
	private _isAddCardFormVisible: boolean = false
	private listeners = new Map<Channel, Set<() => void>>()

	public get activeCardId(): string | null {
		return this._activeCardId
	}

	public set activeCardId(id: string | null) {
		this._activeCardId = id

		if (id !== null) {
			requestWakeLock()
		} else {
			releaseWakeLock()
		}

		this.notify('activeCard')
	}

	public get isAddCardFormVisible(): boolean {
		return this._isAddCardFormVisible
	}

	public set isAddCardFormVisible(visible: boolean) {
		this._isAddCardFormVisible = visible
		this.activeCardId = null
		this.notify('isAddCardFormVisible')
	}

	public get cards(): Card[] {
		return this._cards
	}

	public refreshCards = async () => {
		this._cards = await getCards()
		this.notify('cards')
	}

	public saveCard = async (card: Card): Promise<void> => {
		await saveCard(card)
		await this.refreshCards()
	}

	public deleteCards = async (ids: string[]): Promise<void> => {
		await deleteCards(ids)
		await this.refreshCards()
	}

	private notify(channel: Channel) {
		this.listeners.get(channel)?.forEach(fn => fn())
	}

	public subscribe(channel: Channel, fn: () => void): () => void {
		if (!this.listeners.has(channel)) this.listeners.set(channel, new Set())
		this.listeners.get(channel)!.add(fn)
		return () => this.listeners.get(channel)!.delete(fn)
	}
}

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible' && state.activeCardId !== null) {
		requestWakeLock()
	}
})

const state = new State()
await state.refreshCards()
export default state