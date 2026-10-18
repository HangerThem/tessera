import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { createBackup, parseBackup } from '../backup'
import { cards } from '../store'
import { BackupScreen } from './BackupScreen'

const db = vi.hoisted(() => ({ set: vi.fn(async () => {}) }))

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  set: db.set,
  keys: async () => [],
  getMany: async () => [],
}))

// The transfer itself is covered in DeviceTransfer.test.tsx.
vi.mock('./DeviceTransfer', async () => {
  const backup = await import('../backup')
  const gym = {
    id: 'card-3',
    name: 'Gym',
    barcodeValue: '87654321',
    barcodeFormat: 4,
    isFavorite: false,
  }
  return {
    ReceiveCards: ({ onReceived }: { onReceived: (backup: string) => void }) => (
      <button onClick={() => onReceived(backup.createBackup([gym as Card]))}>
        Finish receiving
      </button>
    ),
    SendCards: ({ payload, cardCount }: { payload: string; cardCount: number }) => (
      <p data-testid="sending" data-payload={payload}>
        Sending {cardCount}
      </p>
    ),
  }
})

const card: Card = {
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  barcodeFormat: 4 as Card['barcodeFormat'], // BarcodeFormat.CODE_128
  isFavorite: false,
}

const exportButton = () => screen.getByRole('button', { name: 'Export cards' }) as HTMLButtonElement

function chooseFile(contents: string) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File([contents], 'backup.json', { type: 'application/json' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

describe('BackupScreen export', () => {
  beforeEach(() => {
    cards.value = [card]
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    Object.assign(navigator, { share: undefined, canShare: undefined })
  })

  it('shares the backup file where sharing files is supported', async () => {
    const share = vi.fn(async (_data: ShareData) => {})
    Object.assign(navigator, { share, canShare: () => true })
    render(<BackupScreen onClose={() => {}} />)

    fireEvent.click(exportButton())

    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const [file] = share.mock.calls[0][0].files!
    expect(file.name).toBe('tessera-backup-2026-10-18.json')
    expect(parseBackup(await file.text())).toEqual([card])
  })

  it('downloads the backup file where sharing files is not supported', async () => {
    const createObjectURL = vi.fn(() => 'blob:backup')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<BackupScreen onClose={() => {}} />)

    fireEvent.click(exportButton())

    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('tessera-backup-2026-10-18.json')
    expect(link.href).toBe('blob:backup')
  })

  it("can't export when there are no cards", () => {
    cards.value = []
    render(<BackupScreen onClose={() => {}} />)

    expect(exportButton().disabled).toBe(true)
  })
})

describe('BackupScreen import', () => {
  beforeEach(() => {
    cards.value = [card]
    db.set.mockClear()
  })

  afterEach(cleanup)

  const otherCard: Card = { ...card, id: 'card-2', name: 'Library' }

  it('imports the cards after confirming, keeping the ones already here', async () => {
    render(<BackupScreen onClose={() => {}} />)

    chooseFile(createBackup([card, otherCard]))
    await screen.findByText('Import 2 cards from this backup?')
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'Added 1 card. 1 was already on this device.',
      ),
    )
    expect(db.set).toHaveBeenCalledWith('card-2', otherCard, expect.anything())
    expect(db.set).not.toHaveBeenCalledWith('card-1', expect.anything(), expect.anything())
  })

  it("doesn't import when cancelled", async () => {
    render(<BackupScreen onClose={() => {}} />)

    chooseFile(createBackup([otherCard]))
    await screen.findByText('Import 1 card from this backup?')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Import 1 card from this backup?')).toBeNull()
    expect(db.set).not.toHaveBeenCalled()
  })

  it("explains why a file can't be imported", async () => {
    render(<BackupScreen onClose={() => {}} />)

    chooseFile('{"cards": []}')

    expect((await screen.findByRole('alert')).textContent).toBe("This file isn't a Tessera backup.")
  })

  it('says when a backup has no cards', async () => {
    render(<BackupScreen onClose={() => {}} />)

    chooseFile(createBackup([]))

    expect((await screen.findByRole('alert')).textContent).toBe('This backup has no cards.')
  })
})

describe('BackupScreen transfer to another device', () => {
  beforeEach(() => {
    cards.value = [card]
    db.set.mockClear()
  })

  afterEach(cleanup)

  it('sends all cards to the other phone', () => {
    render(<BackupScreen onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send cards' }))

    const sending = screen.getByTestId('sending')
    expect(sending.textContent).toBe('Sending 1')
    expect(parseBackup(sending.dataset.payload!)).toEqual([card])
  })

  it('asks before importing the cards received from the other phone', async () => {
    render(<BackupScreen onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Receive cards' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finish receiving' }))
    await screen.findByText('Import 1 card from the other phone?')
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Added 1 card.'))
    expect(db.set).toHaveBeenCalledWith('card-3', expect.anything(), expect.anything())
  })

  it("can't send when there are no cards", () => {
    cards.value = []
    render(<BackupScreen onClose={() => {}} />)

    expect((screen.getByRole('button', { name: 'Send cards' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})
