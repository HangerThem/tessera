/**
 * Opens the on-screen keyboard for an input that will only be mounted after the next render.
 *
 * iOS Safari only shows the keyboard when an input is focused synchronously inside a user gesture, so
 * focusing the real input from an effect gives it focus but no keyboard. Call this from the gesture
 * handler: it focuses a hidden placeholder input right away, which opens the keyboard, and returns a
 * function that moves focus to the real input once it exists. iOS keeps the keyboard open when focus
 * moves from one input to another.
 *
 * @param container - Element to attach the placeholder to, e.g. the dialog, so focus stays inside it.
 * @returns A function that focuses the target and removes the placeholder.
 */
export function holdKeyboardFocus(
  container: HTMLElement,
): (target: HTMLElement | null | undefined) => void {
  const placeholder = document.createElement('input')
  placeholder.setAttribute('aria-hidden', 'true')
  placeholder.tabIndex = -1
  // A font size of at least 16px stops iOS from zooming in when the placeholder is focused.
  placeholder.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;'
  container.appendChild(placeholder)
  placeholder.focus()

  return (target) => {
    target?.focus()
    placeholder.remove()
  }
}
