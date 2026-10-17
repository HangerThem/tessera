import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { createRef } from 'preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CameraError, CameraState } from '../types/Camera.type'

import { BarcodeScannerView } from './BarcodeScannerView'

const deniedError: CameraError = {
  reason: 'denied',
  title: 'Camera access blocked',
  message: 'Allow camera access, then try again.',
  retryable: true,
}

const notFoundError: CameraError = {
  reason: 'not-found',
  title: 'No camera found',
  message: 'You can enter the code manually instead.',
  retryable: false,
}

function renderView(cameraState: CameraState, cameraError: CameraError | null = null) {
  const onRetry = vi.fn()
  const onManualEntry = vi.fn()
  const videoRef = createRef<HTMLVideoElement>()
  const view = render(
    <BarcodeScannerView
      cameraState={cameraState}
      cameraError={cameraError}
      videoRef={videoRef}
      onRetry={onRetry}
      onManualEntry={onManualEntry}
    />,
  )
  return { ...view, onRetry, onManualEntry, videoRef }
}

describe('BarcodeScannerView', () => {
  afterEach(cleanup)

  it('keeps the video element mounted but hidden while idle', () => {
    const { container, videoRef } = renderView('idle')

    expect(videoRef.current).toBeInstanceOf(HTMLVideoElement)
    expect(container.firstElementChild?.classList.contains('hidden')).toBe(true)
  })

  it('shows a loading state while the camera starts', () => {
    renderView('requesting')

    expect(screen.getByText('Starting camera…')).toBeTruthy()
    expect(screen.getByText('If asked, allow access to the camera.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows scanning instructions once the camera is active', () => {
    renderView('active')

    expect(screen.getByText(/Point the camera at the barcode/)).toBeTruthy()
    expect(screen.queryByText('Starting camera…')).toBeNull()
  })

  it('lets the user switch to manual entry while scanning', () => {
    const { onManualEntry } = renderView('active')

    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))

    expect(onManualEntry).toHaveBeenCalledOnce()
  })

  it('explains a retryable error and offers retry and manual entry', () => {
    const { onRetry, onManualEntry } = renderView('error', deniedError)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(deniedError.title)
    expect(alert.textContent).toContain(deniedError.message)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))
    expect(onManualEntry).toHaveBeenCalledOnce()
  })

  it('offers only manual entry when retrying cannot help', () => {
    renderView('error', notFoundError)

    expect(screen.getByRole('alert').textContent).toContain(notFoundError.title)
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enter code manually' })).toBeTruthy()
  })
})
