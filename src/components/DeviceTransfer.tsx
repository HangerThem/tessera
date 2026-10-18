import { LoaderCircle, RotateCcw, ScanQrCode } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'

import { QRCodeFormat } from '../enums/codeFormats'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { startReceiving, startSending, TransferError } from '../transfer'
import { BarcodeCanvas } from './BarcodeCanvas'
import { BarcodeScannerView } from './BarcodeScannerView'
import { Button } from './ui/Button'

const UNSUPPORTED_MESSAGE = "This browser can't transfer cards directly. Use a backup file instead."
const SCAN_HINT = 'Point the camera at the code on the other phone.'

type Failure = { message: string; canRetry: boolean }

function toFailure(err: unknown, setup: boolean): Failure {
  if (err instanceof TransferError) return { message: err.message, canRetry: true }
  console.error('Transfer failed:', err)
  // Failing before anything was scanned means the browser lacks WebRTC or compression streams.
  return setup
    ? { message: UNSUPPORTED_MESSAGE, canRetry: false }
    : { message: 'Something went wrong. Try again.', canRetry: true }
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

type TransferHandle = { close: () => void }

/** Closes the current connection whenever it's replaced or the component unmounts. */
function useTransferHandle<T extends TransferHandle>() {
  const ref = useRef<T | null>(null)
  useEffect(() => () => ref.current?.close(), [])
  const replace = (next: T | null) => {
    ref.current?.close()
    ref.current = next
  }
  return [ref, replace] as const
}

function TransferCode({ code }: { code: string }) {
  return (
    <div className="flex justify-center rounded-md bg-white p-3">
      <BarcodeCanvas
        value={code}
        format={QRCodeFormat.QR_CODE}
        size="large"
        label="Transfer code"
      />
    </div>
  )
}

function Progress({ text }: { text: string }) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm" role="status">
      <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
      {text}
    </p>
  )
}

function FailureMessage({ failure }: { failure: Failure }) {
  return (
    <p role="alert" className="rounded-md bg-foreground/5 p-4 text-sm text-center">
      {failure.message}
    </p>
  )
}

type ReceiveState =
  | { step: 'preparing' }
  | { step: 'showing'; offerCode: string }
  | { step: 'connecting' }
  | { step: 'receiving'; progress: number }
  | { step: 'failed'; failure: Failure }

interface ReceiveProps {
  /** Called with the backup sent by the other device. */
  onReceived: (backup: string) => void
  onCancel: () => void
}

/** Receives cards from another device: shows this device's code, then scans the other's reply. */
export function ReceiveCards({ onReceived, onCancel }: ReceiveProps) {
  const [state, setState] = useState<ReceiveState>({ step: 'preparing' })
  const [attempt, setAttempt] = useState(0)
  const [receiverRef, setReceiver] = useTransferHandle<Awaited<ReturnType<typeof startReceiving>>>()

  const { cameraState, cameraError, videoRef, start, stop } = useBarcodeScanner({
    onDetect: (answerCode) => {
      const receiver = receiverRef.current
      if (!receiver) return
      setState({ step: 'connecting' })
      receiver
        .receive(answerCode)
        .then(onReceived)
        .catch((err) => setState({ step: 'failed', failure: toFailure(err, false) }))
    },
  })

  useEffect(() => {
    let cancelled = false
    setState({ step: 'preparing' })
    startReceiving({ onProgress: (progress) => setState({ step: 'receiving', progress }) })
      .then((receiver) => {
        if (cancelled) return receiver.close()
        setReceiver(receiver)
        setState({ step: 'showing', offerCode: receiver.offerCode })
      })
      .catch((err) => !cancelled && setState({ step: 'failed', failure: toFailure(err, true) }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const scanning = cameraState !== 'idle'

  const handleCancel = () => {
    stop()
    setReceiver(null)
    onCancel()
  }

  return (
    <div className="flex flex-col gap-4">
      {state.step === 'preparing' && <Progress text="Preparing…" />}
      {state.step === 'showing' && !scanning && (
        <>
          <p className="text-sm text-foreground/70">
            On your other phone, open Tessera and go to Backup › Send cards. Scan this code with it,
            then scan the code it shows. Both phones need to be on the same Wi-Fi.
          </p>
          <TransferCode code={state.offerCode} />
          <Button type="button" onClick={start}>
            <ScanQrCode aria-hidden="true" />
            Scan the other phone's code
          </Button>
        </>
      )}
      {state.step === 'connecting' && <Progress text="Connecting…" />}
      {state.step === 'receiving' && (
        <Progress text={`Receiving cards… ${Math.round(state.progress * 100)}%`} />
      )}
      {state.step === 'failed' && (
        <>
          <FailureMessage failure={state.failure} />
          {state.failure.canRetry && (
            <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw aria-hidden="true" />
              Start again
            </Button>
          )}
        </>
      )}

      <BarcodeScannerView
        cameraState={cameraState}
        cameraError={cameraError}
        videoRef={videoRef}
        onRetry={start}
        hint={SCAN_HINT}
      />

      <Button type="button" variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  )
}

type SendState =
  | { step: 'ready' }
  | { step: 'preparing' }
  | { step: 'showing'; answerCode: string }
  | { step: 'sent' }
  | { step: 'failed'; failure: Failure }

interface SendProps {
  /** The backup to send. */
  payload: string
  cardCount: number
  onDone: () => void
  onCancel: () => void
}

/** Sends cards to another device: scans the other device's code, then shows this one's reply. */
export function SendCards({ payload, cardCount, onDone, onCancel }: SendProps) {
  const [state, setState] = useState<SendState>({ step: 'ready' })
  const [, setSender] = useTransferHandle<Awaited<ReturnType<typeof startSending>>>()

  const { cameraState, cameraError, videoRef, start, stop } = useBarcodeScanner({
    onDetect: (offerCode) => {
      setState({ step: 'preparing' })
      startSending(offerCode, payload)
        .then((sender) => {
          setSender(sender)
          setState({ step: 'showing', answerCode: sender.answerCode })
          return sender.sent.then(() => setState({ step: 'sent' }))
        })
        .catch((err) => setState({ step: 'failed', failure: toFailure(err, false) }))
    },
  })

  const scanning = cameraState !== 'idle'

  const handleCancel = () => {
    stop()
    setSender(null)
    onCancel()
  }

  const scanButton = (label: string) => (
    <Button type="button" onClick={start}>
      <ScanQrCode aria-hidden="true" />
      {label}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      {state.step === 'ready' && !scanning && (
        <>
          <p className="text-sm text-foreground/70">
            On your new phone, open Tessera and go to Backup › Receive cards. Then scan the code it
            shows. Both phones need to be on the same Wi-Fi.
          </p>
          {scanButton("Scan the other phone's code")}
        </>
      )}
      {state.step === 'preparing' && <Progress text="Preparing…" />}
      {state.step === 'showing' && (
        <>
          <p className="text-sm text-foreground/70">
            Now scan this code with your new phone. Keep this screen open until the cards are sent.
          </p>
          <TransferCode code={state.answerCode} />
        </>
      )}
      {state.step === 'sent' && (
        <>
          <p role="status" className="rounded-md bg-foreground/5 p-4 text-sm text-center">
            Sent {plural(cardCount, 'card')} to the other phone.
          </p>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </>
      )}
      {state.step === 'failed' && (
        <>
          <FailureMessage failure={state.failure} />
          {state.failure.canRetry && !scanning && scanButton('Scan again')}
        </>
      )}

      <BarcodeScannerView
        cameraState={cameraState}
        cameraError={cameraError}
        videoRef={videoRef}
        onRetry={start}
        hint={SCAN_HINT}
      />

      {state.step !== 'sent' && (
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      )}
    </div>
  )
}
