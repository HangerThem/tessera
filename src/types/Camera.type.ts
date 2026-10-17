export type CameraState = 'idle' | 'requesting' | 'active' | 'error'

export type CameraErrorReason = 'denied' | 'not-found' | 'in-use' | 'unsupported' | 'timeout' | 'unknown'

export interface CameraError {
  reason: CameraErrorReason
  title: string
  message: string
  /** Whether trying again has a realistic chance of succeeding without the user changing settings. */
  retryable: boolean
}
