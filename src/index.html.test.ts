import { afterEach, describe, expect, it, vi } from 'vitest'

import indexHtml from '../index.html?raw'

/** The inline script in <head> that applies the theme before the first paint. */
function themeScript(): string | undefined {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html')
  return (
    Array.from(doc.head.querySelectorAll('script:not([src])')).find((script) =>
      script.textContent?.includes('theme'),
    )?.textContent ?? undefined
  )
}

function runThemeScript({ stored, systemDark }: { stored: string | null; systemDark: boolean }) {
  if (stored) localStorage.setItem('theme', stored)
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({ matches: systemDark && query === '(prefers-color-scheme: dark)' }) as MediaQueryList,
  )
  const script = themeScript()
  if (!script) throw new Error('index.html has no inline theme script in <head>')
  new Function(script)()
  return document.documentElement.dataset.theme
}

describe('index.html theme script', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it.each([
    { stored: null, systemDark: false, expected: 'light' },
    { stored: null, systemDark: true, expected: 'dark' },
    { stored: 'dark', systemDark: false, expected: 'dark' },
    { stored: 'light', systemDark: true, expected: 'light' },
  ])(
    'applies $expected before the first paint (stored: $stored, system dark: $systemDark)',
    ({ stored, systemDark, expected }) => {
      expect(runThemeScript({ stored, systemDark })).toBe(expected)
    },
  )

  it('does not break the page when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('', 'SecurityError')
    })

    expect(() => runThemeScript({ stored: null, systemDark: false })).not.toThrow()
  })
})
