import { act, cleanup, renderHook } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'
import type { CameraError } from '../types/Camera.type'

import { BarcodeFormat } from '../enums/codeFormats'
import { useBarcodeScanner } from './useBarcodeScanner'

const scanners = vi.hoisted(
  () => [] as { options: BarcodeScannerOptions; start: () => void; stop: () => void }[],
)

vi.mock('../barcodeScanner', () => ({
  BarcodeScanner: class {
    start = vi.fn()
    stop = vi.fn()
    constructor(public options: BarcodeScannerOptions) {
      scanners.push(this)
    }
  },
}))

type OnDetect = (value: string, format: number) => void

function renderScanner(onDetect: OnDetect = () => {}) {
  const hook = renderHook((props: { onDetect: OnDetect }) => useBarcodeScanner(props), {
    initialProps: { onDetect },
  })
  const video = document.createElement('video')
  hook.result.current.videoRef.current = video
  return { ...hook, video }
}

const error: CameraError = {
  reason: 'denied',
  title: 'Blocked',
  message: 'Allow access',
  retryable: true,
}

describe('useBarcodeScanner', () => {
  afterEach(() => {
    cleanup()
    scanners.length = 0
  })

  it('starts the scanner on the video element right away', () => {
    const { result, video } = renderScanner()

    result.current.start()

    expect(scanners).toHaveLength(1)
    expect(scanners[0].start).toHaveBeenCalledWith(video)
  })

  it('does nothing when the video element is not mounted', () => {
    const { result } = renderScanner()
    result.current.videoRef.current = null

    result.current.start()

    expect(scanners).toHaveLength(0)
  })

  it('exposes camera state and error reported by the scanner', () => {
    const { result } = renderScanner()
    expect(result.current.cameraState).toBe('idle')

    result.current.start()
    act(() => scanners[0].options.onStateChange?.('active'))
    expect(result.current.cameraState).toBe('active')
    expect(result.current.isScanning).toBe(true)

    act(() => scanners[0].options.onStateChange?.('error', error))
    expect(result.current.cameraState).toBe('error')
    expect(result.current.cameraError).toEqual(error)
    expect(result.current.isScanning).toBe(false)

    act(() => scanners[0].options.onStateChange?.('requesting'))
    expect(result.current.cameraError).toBeNull()
  })

  it('does not restart the camera when rerendered with a new onDetect callback', () => {
    const { result, rerender } = renderScanner()
    result.current.start()
    act(() => scanners[0].options.onStateChange?.('active'))

    rerender({ onDetect: () => {} })

    expect(scanners).toHaveLength(1)
    expect(scanners[0].start).toHaveBeenCalledOnce()
    expect(scanners[0].stop).not.toHaveBeenCalled()
    expect(result.current.cameraState).toBe('active')
  })

  it('calls the latest onDetect callback with a numeric format', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const { result, rerender } = renderScanner(first)
    result.current.start()

    rerender({ onDetect: latest })
    act(() => scanners[0].options.onDetect('4006381333931', BarcodeFormat.EAN_13))

    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledWith('4006381333931', BarcodeFormat.EAN_13)
  })

  it('stops the camera on unmount', () => {
    const { result, unmount } = renderScanner()
    result.current.start()

    unmount()

    expect(scanners[0].stop).toHaveBeenCalled()
  })
})
