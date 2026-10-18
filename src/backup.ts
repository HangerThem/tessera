import type { Card, LegacyCard } from './types/Card.type'

import { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'
import { fromLegacyCard } from './legacyCard'

/**
 * Bump when the backup format changes, and keep `parseBackup` reading older versions.
 *
 * - 1: cards had a barcode format and an optional QR code format.
 * - 2: cards have a single format.
 */
export const BACKUP_VERSION = 2

type Backup = {
  app: 'tessera'
  version: number
  exportedAt: string
  cards: Card[]
}

/** A backup that can't be imported. The message is meant to be shown to the user. */
export class BackupError extends Error {
  name = 'BackupError'
}

/**
 * Serializes cards into a backup file's contents.
 *
 * @param {Card[]} cards - The cards to back up.
 * @param {Date} [now] - When the backup was made.
 * @returns {string} The backup as JSON.
 */
export function createBackup(cards: Card[], now = new Date()): string {
  const backup: Backup = {
    app: 'tessera',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    cards,
  }
  return JSON.stringify(backup)
}

/**
 * Reads the cards from a backup file's contents.
 *
 * @param {string} text - The backup as JSON.
 * @returns {Card[]} The cards in the backup.
 * @throws {BackupError} If the file isn't a Tessera backup, is from a newer version, or is damaged.
 */
export function parseBackup(text: string): Card[] {
  let backup: Partial<Backup> | null
  try {
    backup = JSON.parse(text)
  } catch {
    throw new BackupError("This file isn't a Tessera backup.")
  }

  if (backup?.app !== 'tessera' || typeof backup.version !== 'number') {
    throw new BackupError("This file isn't a Tessera backup.")
  }
  if (backup.version > BACKUP_VERSION) {
    throw new BackupError(
      'This backup was made by a newer version of Tessera. Update the app and try again.',
    )
  }
  if (!Array.isArray(backup.cards)) {
    throw new BackupError("This backup is damaged and can't be imported.")
  }
  if (backup.version === 1) {
    const legacyCards: unknown[] = backup.cards
    if (!legacyCards.every(isLegacyCard)) {
      throw new BackupError("This backup is damaged and can't be imported.")
    }
    return legacyCards.map(fromLegacyCard)
  }
  if (!backup.cards.every(isCard)) {
    throw new BackupError("This backup is damaged and can't be imported.")
  }

  return backup.cards
}

const isEnumValue = (enumObject: object, value: unknown) =>
  typeof value === 'number' && Object.values(enumObject).includes(value)

/** Checks the fields every version of a card has. */
function hasCardFields(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Partial<Record<keyof Card, unknown>>
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.barcodeValue === 'string' &&
    typeof card.isFavorite === 'boolean' &&
    (card.color === undefined || typeof card.color === 'string') &&
    (card.note === undefined || typeof card.note === 'string')
  )
}

function isCard(value: unknown): value is Card {
  return (
    hasCardFields(value) &&
    (isEnumValue(BarcodeFormat, value.format) || isEnumValue(QRCodeFormat, value.format))
  )
}

function isLegacyCard(value: unknown): value is LegacyCard {
  return (
    hasCardFields(value) &&
    isEnumValue(BarcodeFormat, value.barcodeFormat) &&
    (value.qrCodeFormat === undefined || isEnumValue(QRCodeFormat, value.qrCodeFormat))
  )
}
