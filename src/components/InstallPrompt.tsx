import { Share, SquarePlus } from 'lucide-preact'
import { useId } from 'preact/hooks'

interface Props {
  onDismiss: () => void
}

/**
 * Asks Safari users on iOS to add the app to the home screen, where Safari doesn't clear its
 * storage after 7 days without a visit.
 */
export function InstallPrompt({ onDismiss }: Props) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-xl border border-foreground/10 bg-surface-raised p-4 mt-2"
    >
      <h2 className="font-semibold" id={titleId}>
        Add Tessera to your Home Screen
      </h2>
      <p className="text-sm text-foreground/70">
        Safari may delete your cards if you don't open Tessera for 7 days. Cards in the Home Screen
        app are kept.
      </p>
      <p className="text-sm">
        Tap <Share className="inline w-4 h-4 align-text-bottom" aria-label="Share" /> Share, then{' '}
        <SquarePlus className="inline w-4 h-4 align-text-bottom" aria-hidden="true" /> Add to Home
        Screen.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="self-end rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground/70 hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-colors"
      >
        Not now
      </button>
    </section>
  )
}
