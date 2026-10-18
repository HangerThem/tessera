import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Point } from '../utils/perspective'

import { PhotoCropper } from './PhotoCropper'

const corners: Point[] = [
  { x: 40, y: 20 },
  { x: 360, y: 20 },
  { x: 360, y: 180 },
  { x: 40, y: 180 },
]

function renderCropper(detected = true) {
  const callbacks = { onConfirm: vi.fn(), onUseWholePhoto: vi.fn(), onCancel: vi.fn() }
  render(
    <PhotoCropper
      imageUrl="blob:photo"
      imageWidth={400}
      imageHeight={200}
      initialCorners={corners}
      detected={detected}
      {...callbacks}
    />,
  )
  return callbacks
}

const handle = (name: string) => screen.getByRole('button', { name })

describe('PhotoCropper', () => {
  afterEach(cleanup)

  it('places a handle on each corner', () => {
    renderCropper()

    expect(handle('Top-left corner').style.left).toBe('10%')
    expect(handle('Top-left corner').style.top).toBe('10%')
    expect(handle('Bottom-right corner').style.left).toBe('90%')
    expect(handle('Bottom-right corner').style.top).toBe('90%')
  })

  it('moves a corner by dragging it', () => {
    const { onConfirm } = renderCropper()
    // The photo is shown at half size.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }),
    )

    fireEvent.pointerDown(handle('Top-left corner'), { pointerId: 1, clientX: 20, clientY: 10 })
    fireEvent.pointerMove(handle('Top-left corner'), { pointerId: 1, clientX: 50, clientY: 25 })
    fireEvent.pointerUp(handle('Top-left corner'), { pointerId: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))

    expect(onConfirm.mock.calls[0][0][0]).toEqual({ x: 100, y: 50 })
  })

  it('keeps dragged corners inside the photo', () => {
    const { onConfirm } = renderCropper()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }),
    )

    fireEvent.pointerDown(handle('Bottom-right corner'), { pointerId: 1 })
    fireEvent.pointerMove(handle('Bottom-right corner'), {
      pointerId: 1,
      clientX: 500,
      clientY: 500,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))

    expect(onConfirm.mock.calls[0][0][2]).toEqual({ x: 400, y: 200 })
  })

  it('moves a corner with the arrow keys', () => {
    const { onConfirm } = renderCropper()

    fireEvent.keyDown(handle('Top-right corner'), { key: 'ArrowLeft' })
    fireEvent.keyDown(handle('Top-right corner'), { key: 'ArrowDown', shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))

    // 1% of the width per press, 5% of the height with Shift.
    expect(onConfirm.mock.calls[0][0][1]).toEqual({ x: 356, y: 30 })
  })

  it('says when no card was found', () => {
    renderCropper(false)

    expect(screen.getByText(/Tessera couldn't find the card/)).toBeTruthy()
  })

  it('can use the whole photo instead, or cancel', () => {
    const { onUseWholePhoto, onCancel } = renderCropper()

    fireEvent.click(screen.getByRole('button', { name: 'Use whole photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onUseWholePhoto).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
