import { DatabaseZap, RotateCcw } from 'lucide-preact'

import { Button } from './ui/Button'

interface Props {
  onRetry: () => void
}

/** Shown instead of the card list when the cards can't be read from storage. */
export function StorageError({ onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md bg-foreground/5 p-6 mt-8 text-center"
    >
      <DatabaseZap className="w-10 h-10 text-foreground/50" aria-hidden="true" />
      <h2 className="font-semibold">Tessera can't open its storage</h2>
      <p className="text-sm text-foreground/70">
        Your browser didn't let Tessera read its saved cards. This can happen in private browsing,
        or when site data is blocked in the browser's settings.
      </p>
      <Button type="button" onClick={onRetry}>
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}
