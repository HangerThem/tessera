import { afterEach, describe, expect, it } from 'vitest'

import { holdKeyboardFocus } from './keyboard'

describe('holdKeyboardFocus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses a hidden placeholder input synchronously inside the container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    holdKeyboardFocus(container)

    const placeholder = document.activeElement
    expect(placeholder).toBeInstanceOf(HTMLInputElement)
    expect(container.contains(placeholder)).toBe(true)
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true')
  })

  it('moves focus to the target and removes the placeholder', () => {
    const container = document.createElement('div')
    const target = document.createElement('input')
    container.appendChild(target)
    document.body.appendChild(container)

    const release = holdKeyboardFocus(container)
    release(target)

    expect(document.activeElement).toBe(target)
    expect(container.querySelectorAll('input')).toHaveLength(1)
  })

  it('still removes the placeholder when the target is missing', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    holdKeyboardFocus(container)(null)

    expect(container.querySelector('input')).toBeNull()
  })
})
