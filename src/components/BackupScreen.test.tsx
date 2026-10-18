import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { parseBackup } from '../backup'
import { cards } from '../store'
import { BackupScreen } from './BackupScreen'

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  set: async () => {},
  keys: async () => [],
  getMany: async () => [],
}))

const card: Card = {
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  barcodeFormat: 4 as Card['barcodeFormat'], // BarcodeFormat.CODE_128
  isFavorite: false,
}

const exportButton = () => screen.getByRole('button', { name: 'Export cards' }) as HTMLButtonElement

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
    const share = vi.fn(async () => {})
    Object.assign(navigator, { share, canShare: () => true })
    render(<BackupScreen onClose={() => {}} />)

    fireEvent.click(exportButton())

    await waitFor(() => expect(share).toHaveBeenCalledOnce())
    const [file] = share.mock.calls[0][0].files as File[]
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
