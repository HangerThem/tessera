import { describe, expect, it } from 'vitest'

import type { Card } from './types/Card.type'

import { BACKUP_VERSION, BackupError, createBackup, parseBackup } from './backup'
import { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'

const cards: Card[] = [
  {
    id: 'card-1',
    name: 'Grocery',
    barcodeValue: '4006381333931',
    format: BarcodeFormat.EAN_13,
    isFavorite: true,
    color: '#3b82f6',
  },
  {
    id: 'card-2',
    name: 'Library',
    barcodeValue: 'https://example.com/member/123',
    format: QRCodeFormat.QR_CODE,
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

  it('reads version 1 backups, which stored a barcode and a QR code format', () => {
    const backup = JSON.stringify({
      app: 'tessera',
      version: 1,
      exportedAt: '2026-10-18T12:00:00.000Z',
      cards: [
        { ...cards[0], format: undefined, barcodeFormat: BarcodeFormat.EAN_13, qrCodeFormat: 11 },
        { ...cards[1], format: undefined, barcodeFormat: BarcodeFormat.CODE_128 },
      ],
    })

    // Version 1 didn't record which format a card used, so the barcode format is kept.
    expect(parseBackup(backup)).toEqual([cards[0], { ...cards[1], format: BarcodeFormat.CODE_128 }])
  })

  it('rejects version 1 backups with invalid formats', () => {
    const backup = JSON.stringify({
      app: 'tessera',
      version: 1,
      cards: [{ ...cards[0], format: undefined, barcodeFormat: 999 }],
    })

    expect(() => parseBackup(backup)).toThrow("This backup is damaged and can't be imported.")
  })

  it('rejects backups with invalid cards', () => {
    for (const card of [
      { ...cards[0], id: 1 },
      { ...cards[0], name: undefined },
      { ...cards[0], format: 999 },
      { ...cards[0], format: undefined },
      { ...cards[0], isFavorite: 'yes' },
      { ...cards[0], color: 42 },
    ]) {
      expect(() => parseBackup(backupWith(card))).toThrow(
        "This backup is damaged and can't be imported.",
      )
    }
  })
})
