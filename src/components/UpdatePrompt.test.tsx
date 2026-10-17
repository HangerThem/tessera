import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { UpdatePrompt } from './UpdatePrompt'

function renderPrompt() {
  const onReload = vi.fn()
  const onDismiss = vi.fn()
  render(<UpdatePrompt onReload={onReload} onDismiss={onDismiss} />)
  return { onReload, onDismiss }
}

describe('UpdatePrompt', () => {
  afterEach(cleanup)

  it('announces the new version politely', () => {
    renderPrompt()

    expect(screen.getByRole('status').textContent).toContain('Update available')
  })

  it('reloads into the new version', () => {
    const { onReload, onDismiss } = renderPrompt()

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('can be dismissed', () => {
    const { onReload, onDismiss } = renderPrompt()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }))

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onReload).not.toHaveBeenCalled()
  })
})
