import { describe, expect, it } from 'vitest'

import type { Card } from './types/Card.type'

import { BACKUP_VERSION, BackupError, createBackup, parseBackup } from './backup'
import { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'

const cards: Card[] = [
  {
    id: 'card-1',
    name: 'Grocery',
    barcodeValue: '4006381333931',
    barcodeFormat: BarcodeFormat.EAN_13,
    qrCodeFormat: QRCodeFormat.QR_CODE,
    isFavorite: true,
    color: '#3b82f6',
  },
  {
    id: 'card-2',
    name: 'Library',
    barcodeValue: 'A123',
    barcodeFormat: BarcodeFormat.CODE_39,
    isFavorite: false,
  },
]

const backupWith = (card: object) =>
  JSON.stringify({ app: 'tessera', version: BACKUP_VERSION, cards: [card] })

describe('createBackup', () => {
  it('writes the cards with the app name and schema version', () => {
    const backup = JSON.parse(createBackup(cards, new Date('2026-10-18T12:00:00Z')))

    expect(backup).toEqual({
      app: 'tessera',
      version: BACKUP_VERSION,
      exportedAt: '2026-10-18T12:00:00.000Z',
      cards,
    })
  })
})

describe('parseBackup', () => {
  it('reads back the cards from a backup', () => {
    expect(parseBackup(createBackup(cards))).toEqual(cards)
  })

  it('rejects files that are not a Tessera backup', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"cards": []}')).toThrow("This file isn't a Tessera backup.")
  })

  it('rejects backups from a newer version of the app', () => {
    const backup = JSON.stringify({ app: 'tessera', version: BACKUP_VERSION + 1, cards: [] })

    expect(() => parseBackup(backup)).toThrow(
      'This backup was made by a newer version of Tessera. Update the app and try again.',
    )
  })

  it('rejects backups with invalid cards', () => {
    for (const card of [
      { ...cards[0], id: 1 },
      { ...cards[0], name: undefined },
      { ...cards[0], barcodeFormat: 999 },
      { ...cards[0], qrCodeFormat: BarcodeFormat.EAN_13 },
      { ...cards[0], isFavorite: 'yes' },
      { ...cards[0], color: 42 },
    ]) {
      expect(() => parseBackup(backupWith(card))).toThrow(
        "This backup is damaged and can't be imported.",
      )
    }
  })
})
