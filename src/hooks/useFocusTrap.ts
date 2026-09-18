import { useEffect, useRef } from 'preact/hooks'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
	const containerRef = useRef<T>(null)

	useEffect(() => {
		if (!active || !containerRef.current) return

		const container = containerRef.current
		const previouslyFocused = document.activeElement as HTMLElement | null

		container.focus()

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return

			const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
			if (focusable.length === 0) { e.preventDefault(); return }

			const first = focusable[0]
			const last = focusable[focusable.length - 1]

			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault()
					last.focus()
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault()
					first.focus()
				}
			}
		}

		container.addEventListener('keydown', handleKeyDown)

		return () => {
			container.removeEventListener('keydown', handleKeyDown)
			previouslyFocused?.focus()
		}
	}, [active])

	return containerRef
}