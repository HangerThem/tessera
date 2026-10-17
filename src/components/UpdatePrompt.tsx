import { RefreshCw, X } from 'lucide-preact'

interface Props {
  onReload: () => void
  onDismiss: () => void
}

/**
 * Tells the user a new version is ready and lets them reload into it.
 *
 * Sits below open dialogs (z-40) so it never covers a card shown at checkout, and leaves room for
 * the add button in the bottom-right corner.
 */
export function UpdatePrompt({ onReload, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-20 z-40 flex items-center gap-3 rounded-lg bg-foreground text-background p-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <p className="flex-1 text-sm">A new version of Tessera is available.</p>
      <button
        type="button"
        onClick={onReload}
        className="flex items-center gap-1 text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Reload
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss update notice"
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
