import type { RefObject } from 'preact'

import { CameraOff, Keyboard, LoaderCircle, RotateCcw } from 'lucide-preact'

import type { CameraError, CameraState } from '../types/Camera.type'

import { Button } from './ui/Button'

interface Props {
  cameraState: CameraState
  cameraError: CameraError | null
  videoRef: RefObject<HTMLVideoElement>
  onRetry: () => void
  onManualEntry: () => void
}

/**
 * Viewfinder, loading and error states for barcode scanning.
 *
 * Always rendered so the video element exists before the user taps "Scan", which lets the camera
 * start synchronously from that tap (required for reliable camera access on iOS).
 */
export function BarcodeScannerView({
  cameraState,
  cameraError,
  videoRef,
  onRetry,
  onManualEntry,
}: Props) {
  const showViewfinder = cameraState === 'requesting' || cameraState === 'active'
  const showError = cameraState === 'error' && cameraError

  return (
    <div className={showViewfinder || showError ? 'flex flex-col gap-3 mb-4' : 'hidden'}>
      <div
        className={
          showViewfinder
            ? 'relative w-full aspect-3/4 max-h-[60vh] overflow-hidden rounded-md bg-black'
            : 'hidden'
        }
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          aria-label="Camera viewfinder"
        />
        {cameraState === 'requesting' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white text-sm text-center p-6">
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            <p>Starting camera…</p>
            <p className="text-white/70 text-xs">If asked, allow access to the camera.</p>
          </div>
        ) : (
          <div
            className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-1/3 rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {cameraState === 'requesting'
          ? 'Starting camera'
          : cameraState === 'active'
            ? 'Camera ready, scanning'
            : ''}
      </p>

      {cameraState === 'active' && (
        <p className="text-sm text-foreground/70 text-center">
          Point the camera at the barcode. It will be scanned automatically.
        </p>
      )}

      {showError && (
        <div
          role="alert"
          className="flex flex-col items-center gap-2 rounded-md bg-foreground/5 p-6 text-center"
        >
          <CameraOff className="text-foreground/50" aria-hidden="true" />
          <h3 className="font-semibold">{cameraError.title}</h3>
          <p className="text-sm text-foreground/70">{cameraError.message}</p>
        </div>
      )}

      {showError && cameraError.retryable && (
        <Button type="button" onClick={onRetry}>
          <RotateCcw />
          Try again
        </Button>
      )}
      <Button type="button" variant="secondary" onClick={onManualEntry}>
        <Keyboard />
        Enter code manually
      </Button>
    </div>
  )
}
