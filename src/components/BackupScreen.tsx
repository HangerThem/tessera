import { Download, Send, Smartphone, Upload, X } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'

import type { Card } from '../types/Card.type'

import { type BackupContents, BackupError, createBackup, parseBackup } from '../backup'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getAllPhotos } from '../photos'
import { cards, importCards } from '../store'
import { saveFile } from '../utils/file'
import { blobToDataUrl, dataUrlToBlob } from '../utils/image'
import { ReceiveCards, SendCards } from './DeviceTransfer'
import { Button } from './ui/Button'

interface Props {
  onClose: () => void
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function describeImport({ added, skipped }: { added: number; skipped: number }) {
  const parts = [added > 0 ? `Added ${plural(added, 'card')}.` : 'No new cards to add.']
  if (skipped > 0) {
    parts.push(`${skipped} ${skipped === 1 ? 'was' : 'were'} already on this device.`)
  }
  return parts.join(' ')
}

type ImportSource = 'file' | 'transfer'

const IMPORT_SOURCE_LABEL: Record<ImportSource, string> = {
  file: 'this backup',
  transfer: 'the other phone',
}

/** A backup of the cards and their photos, made ahead of the tap that saves or sends it. */
type PreparedBackup = { text: string; madeAt: Date }

async function prepareBackup(cardsToBackUp: Card[]): Promise<PreparedBackup> {
  const madeAt = new Date()
  const storedPhotos = await getAllPhotos()
  const photos: Record<string, string> = {}
  for (const card of cardsToBackUp) {
    const photo = storedPhotos[card.id]
    // oxlint-disable-next-line no-await-in-loop -- a handful of photos, read one at a time
    if (photo) photos[card.id] = await blobToDataUrl(photo)
  }
  return { text: createBackup(cardsToBackUp, { now: madeAt, photos }), madeAt }
}

const backupFileName = (date: Date) => `tessera-backup-${date.toISOString().slice(0, 10)}.json`

/** Backs up cards to a file and restores them from one, or moves them directly to another device. */
export function BackupScreen({ onClose }: Props) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const [exportError, setExportError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importSource, setImportSource] = useState<ImportSource>('file')
  const [pendingImport, setPendingImport] = useState<BackupContents | null>(null)
  const [importError, setImportError] = useState<string>()
  const [importResult, setImportResult] = useState<string>()
  const [transferMode, setTransferMode] = useState<'send' | 'receive' | null>(null)
  // Prepared ahead, because reading the photos takes a moment, and the share sheet only opens
  // straight from a tap on iOS.
  const [preparedBackup, setPreparedBackup] = useState<PreparedBackup>()

  useEffect(() => {
    let cancelled = false
    setPreparedBackup(undefined)
    prepareBackup(cards.value)
      .then((backup) => !cancelled && setPreparedBackup(backup))
      .catch((err) => {
        console.error('Preparing the backup failed:', err)
        if (!cancelled) setExportError("The backup couldn't be prepared. Try again.")
      })
    return () => {
      cancelled = true
    }
  }, [cards.value])

  const readBackup = (backup: string, source: ImportSource) => {
    setImportSource(source)
    setImportError(undefined)
    setImportResult(undefined)
    try {
      const contents = parseBackup(backup)
      if (contents.cards.length === 0) {
        setImportError('This backup has no cards.')
        return
      }
      setPendingImport(contents)
    } catch (err) {
      if (!(err instanceof BackupError)) console.error('Reading the backup failed:', err)
      setImportError(err instanceof BackupError ? err.message : "This file couldn't be read.")
    }
  }

  const handleFileChosen = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    // Cleared so choosing the same file again still fires a change.
    input.value = ''
    if (!file) return
    readBackup(await file.text(), 'file')
  }

  const handleReceived = (backup: string) => {
    setTransferMode(null)
    readBackup(backup, 'transfer')
  }

  const handleImport = async () => {
    if (!pendingImport) return
    try {
      const photos = Object.fromEntries(
        Object.entries(pendingImport.photos).map(([id, dataUrl]) => [id, dataUrlToBlob(dataUrl)]),
      )
      setImportResult(describeImport(await importCards(pendingImport.cards, photos)))
    } catch (err) {
      console.error('Import failed:', err)
      setImportError("The cards couldn't be saved. Try again.")
    }
    setPendingImport(null)
  }

  const handleExport = async () => {
    if (!preparedBackup) return
    setExportError(undefined)
    const file = new File([preparedBackup.text], backupFileName(preparedBackup.madeAt), {
      type: 'application/json',
    })
    try {
      await saveFile(file)
    } catch (err) {
      console.error('Export failed:', err)
      setExportError("The backup couldn't be saved. Try again.")
    }
  }

  const importFeedback = (
    <>
      {pendingImport && (
        <div className="flex flex-col gap-3 rounded-md bg-foreground/5 p-3">
          <p className="text-sm font-semibold">
            Import {plural(pendingImport.cards.length, 'card')} from{' '}
            {IMPORT_SOURCE_LABEL[importSource]}?
          </p>
          <div className="flex gap-2">
            <Button type="button" size="small" onClick={handleImport}>
              Import
            </Button>
            <Button
              type="button"
              size="small"
              variant="secondary"
              onClick={() => setPendingImport(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {importError && (
        <p role="alert" className="text-red-500 text-sm">
          {importError}
        </p>
      )}
      <p role="status" className="text-sm empty:hidden">
        {importResult}
      </p>
    </>
  )

  const transferView = transferMode && (
    <section className="flex flex-col gap-3" aria-labelledby="backup-transfer-title">
      <h3 className="font-semibold" id="backup-transfer-title">
        {transferMode === 'send' ? 'Send cards' : 'Receive cards'}
      </h3>
      {transferMode === 'send' ? (
        <SendCards
          payload={preparedBackup!.text}
          cardCount={cards.value.length}
          onDone={() => setTransferMode(null)}
          onCancel={() => setTransferMode(null)}
        />
      ) : (
        <ReceiveCards onReceived={handleReceived} onCancel={() => setTransferMode(null)} />
      )}
    </section>
  )

  return (
    <div
      class="inset-0 fixed bg-background z-50 flex flex-col gap-6 p-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-200"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-screen-title"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" id="backup-screen-title">
          Backup
        </h2>
        <button
          aria-label="Close backup"
          type="button"
          className="text-foreground/50 hover:text-foreground cursor-pointer transition-colors"
          onClick={onClose}
        >
          <X />
        </button>
      </div>

      {transferView || (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="backup-export-title">
            <div>
              <h3 className="font-semibold" id="backup-export-title">
                Back up to a file
              </h3>
              <p className="text-sm text-foreground/70">
                {cards.value.length > 0
                  ? 'Save all your cards to a file. Keep it somewhere safe, or use it to move your cards to another device.'
                  : 'No cards to back up yet.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleExport}
              disabled={cards.value.length === 0 || !preparedBackup}
            >
              <Download aria-hidden="true" />
              Export cards
            </Button>
            {exportError && (
              <p role="alert" className="text-red-500 text-sm">
                {exportError}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="backup-import-title">
            <div>
              <h3 className="font-semibold" id="backup-import-title">
                Restore from a file
              </h3>
              <p className="text-sm text-foreground/70">
                Add the cards from a Tessera backup. Cards already on this device are kept as they
                are.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => handleFileChosen(e.currentTarget)}
            />
            {!(pendingImport && importSource === 'file') && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden="true" />
                Import from file
              </Button>
            )}
            {importSource === 'file' && importFeedback}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="backup-transfer-title">
            <div>
              <h3 className="font-semibold" id="backup-transfer-title">
                Move to another device
              </h3>
              <p className="text-sm text-foreground/70">
                Send your cards straight to a phone on the same Wi-Fi, without a file.
              </p>
            </div>
            {!(pendingImport && importSource === 'transfer') && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTransferMode('send')}
                  disabled={cards.value.length === 0 || !preparedBackup}
                >
                  <Send aria-hidden="true" />
                  Send cards
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTransferMode('receive')}
                >
                  <Smartphone aria-hidden="true" />
                  Receive cards
                </Button>
              </div>
            )}
            {importSource === 'transfer' && importFeedback}
          </section>
        </>
      )}
    </div>
  )
}
