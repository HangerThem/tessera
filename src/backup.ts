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
  /**
   * Card photos as data URLs, by card id. Added within version 2: older versions ignore it, and
   * backups made before it have none.
   */
  photos: Record<string, string>
}

/** What a backup holds once read. */
export type BackupContents = Pick<Backup, 'cards' | 'photos'>

/** A backup that can't be imported. The message is meant to be shown to the user. */
export class BackupError extends Error {
  name = 'BackupError'
}

const DAMAGED_MESSAGE = "This backup is damaged and can't be imported."

/**
 * Serializes cards into a backup file's contents.
 *
 * @param {Card[]} cards - The cards to back up.
 * @param {object} [options]
 * @param {Date} [options.now] - When the backup was made.
 * @param {Record<string, string>} [options.photos] - Card photos as data URLs, by card id.
 * @returns {string} The backup as JSON.
 */
export function createBackup(
  cards: Card[],
  { now = new Date(), photos = {} }: { now?: Date; photos?: Record<string, string> } = {},
): string {
  const backup: Backup = {
    app: 'tessera',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    cards,
    photos,
  }
  return JSON.stringify(backup)
}

/**
 * Reads the cards and their photos from a backup file's contents.
 *
 * @param {string} text - The backup as JSON.
 * @returns {BackupContents} The cards, and their photos as data URLs by card id.
 * @throws {BackupError} If the file isn't a Tessera backup, is from a newer version, or is damaged.
 */
export function parseBackup(text: string): BackupContents {
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

  return { cards: parseCards(backup.version, backup.cards), photos: parsePhotos(backup.photos) }
}

function parseCards(version: number, cards: unknown): Card[] {
  if (!Array.isArray(cards)) throw new BackupError(DAMAGED_MESSAGE)
  if (version === 1) {
    if (!cards.every(isLegacyCard)) throw new BackupError(DAMAGED_MESSAGE)
    return cards.map(fromLegacyCard)
  }
  if (!cards.every(isCard)) throw new BackupError(DAMAGED_MESSAGE)
  return cards
}

function parsePhotos(photos: unknown): Record<string, string> {
  if (photos === undefined) return {}
  if (typeof photos !== 'object' || photos === null || Array.isArray(photos)) {
    throw new BackupError(DAMAGED_MESSAGE)
  }
  const isImage = (photo: unknown) => typeof photo === 'string' && photo.startsWith('data:image/')
  if (!Object.values(photos).every(isImage)) throw new BackupError(DAMAGED_MESSAGE)
  return photos as Record<string, string>
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
    (card.note === undefined || typeof card.note === 'string') &&
    (card.lastUsedAt === undefined || Number.isFinite(card.lastUsedAt))
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
