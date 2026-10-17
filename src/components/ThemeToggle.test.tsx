import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from './ThemeToggle'

const button = () => screen.getByRole('button')

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('defaults to the system theme', () => {
    render(<ThemeToggle />)

    expect(button().getAttribute('aria-label')).toBe('Theme: System. Switch to Light')
  })

  it('starts from the stored theme', () => {
    localStorage.setItem('theme', 'dark')

    render(<ThemeToggle />)

    expect(button().getAttribute('aria-label')).toBe('Theme: Dark. Switch to System')
  })

  it('cycles system, light and dark, saving and applying each choice', () => {
    render(<ThemeToggle />)

    fireEvent.click(button())
    expect(button().getAttribute('aria-label')).toBe('Theme: Light. Switch to Dark')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    fireEvent.click(button())
    expect(button().getAttribute('aria-label')).toBe('Theme: Dark. Switch to System')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    fireEvent.click(button())
    expect(button().getAttribute('aria-label')).toBe('Theme: System. Switch to Light')
    expect(localStorage.getItem('theme')).toBeNull()
  })
})
