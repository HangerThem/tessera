import { X } from 'lucide-preact'

interface Props {
  onReload: () => void
  onDismiss: () => void
}

/**
 * Tells the user a new version is ready and lets them reload into it.
 *
 * Sits below open dialogs (z-40) so it never covers a card shown at checkout. It lines up with the
 * page content on the left and with the add button on the right: same bottom offset and height,
 * with a 12px gap before the button.
 */
export function UpdatePrompt({ onReload, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-3 right-19 z-40 flex min-h-12 items-center gap-2 rounded-xl border border-foreground/10 bg-surface-raised py-1.5 pl-4 pr-1.5 text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <p className="flex-1 truncate text-sm">Update available</p>
      <button
        type="button"
        onClick={onReload}
        className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background cursor-pointer hover:bg-foreground/80 transition-colors"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss update notice"
        className="rounded-lg p-1.5 text-foreground/60 cursor-pointer hover:text-foreground hover:bg-foreground/10 transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
