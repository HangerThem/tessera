import { useEffect, useRef, useState } from 'preact/hooks'

import { BarcodeScanner } from '../barcodeScanner'
import type { CameraError, CameraState } from '../types/Camera.type'

interface UseBarcodeScanner {
  onDetect: (value: string, format: number) => void
}

/**
 * Custom hook to manage barcode scanning functionality.
 *
 * The `videoRef` element must already be mounted when `start` is called, and `start` should be called
 * directly from a user gesture so iOS Safari allows camera access.
 *
 * @param onDetect - Callback function to handle detected barcode values and formats.
 * @returns An object containing camera state, error details, video reference, and control functions.
 */
export function useBarcodeScanner({ onDetect }: UseBarcodeScanner) {
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [cameraError, setCameraError] = useState<CameraError | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<BarcodeScanner | null>(null)
  // Kept in a ref so a new inline callback on every render doesn't restart the camera.
  const onDetectRef = useRef(onDetect)

  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  useEffect(() => () => scannerRef.current?.stop(), [])

  const getScanner = () => {
    scannerRef.current ??= new BarcodeScanner({
      onDetect: (value, format) => onDetectRef.current(value, Number(format)),
      onStateChange: (state, error) => {
        setCameraState(state)
        setCameraError(error ?? null)
      },
    })
    return scannerRef.current
  }

  const start = () => {
    if (!videoRef.current) return
    getScanner().start(videoRef.current)
  }

  const stop = () => {
    scannerRef.current?.stop()
  }

  const isScanning = cameraState === 'requesting' || cameraState === 'active'

  return { isScanning, cameraState, cameraError, videoRef, start, stop }
}
