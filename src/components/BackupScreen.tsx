import { Download, X } from 'lucide-preact'
import { useState } from 'preact/hooks'

import { createBackup } from '../backup'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { cards } from '../store'
import { saveFile } from '../utils/file'
import { Button } from './ui/Button'

interface Props {
  onClose: () => void
}

const backupFileName = (date: Date) => `tessera-backup-${date.toISOString().slice(0, 10)}.json`

/** Backs up cards to a file and restores them from one. */
export function BackupScreen({ onClose }: Props) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const [exportError, setExportError] = useState<string>()

  const handleExport = async () => {
    setExportError(undefined)
    const now = new Date()
    const file = new File([createBackup(cards.value, now)], backupFileName(now), {
      type: 'application/json',
    })
    try {
      await saveFile(file)
    } catch (err) {
      console.error('Export failed:', err)
      setExportError("The backup couldn't be saved. Try again.")
    }
  }

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
        <Button type="button" onClick={handleExport} disabled={cards.value.length === 0}>
          <Download aria-hidden="true" />
          Export cards
        </Button>
        {exportError && (
          <p role="alert" className="text-red-500 text-sm">
            {exportError}
          </p>
        )}
      </section>
    </div>
  )
}
