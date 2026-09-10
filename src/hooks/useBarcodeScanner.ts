import { useEffect, useRef, useState } from 'preact/hooks'
import { BarcodeScanner } from '../barcodeScanner'

interface UseBarcodeScanner {
	onDetect: (value: string, format: number) => void
}

/**
 * Custom hook to manage barcode scanning functionality.
 * 
 * @param onDetect - Callback function to handle detected barcode values and formats.
 * @returns An object containing scanning state, error messages, video reference, and control functions.
 */
export function useBarcodeScanner({ onDetect }: UseBarcodeScanner) {
	const [isScanning, setIsScanning] = useState(false)
	const [scanError, setScanError] = useState('')
	const videoRef = useRef<HTMLVideoElement>(null)
	const scannerRef = useRef<BarcodeScanner | null>(null)

	useEffect(() => {
		if (videoRef.current) videoRef.current.muted = true
	}, [])

	useEffect(() => {
		if (!isScanning || !videoRef.current) return

		if (!scannerRef.current) {
			scannerRef.current = new BarcodeScanner(videoRef.current, {
				onDetect: (value, format) => {
					onDetect(value, Number(format))
					setIsScanning(false)
					setScanError('')
				},
				onError: (message) => {
					setScanError(message)
					setIsScanning(false)
				},
			})
		}

		scannerRef.current.start()
		return () => { scannerRef.current?.stop() }
	}, [isScanning, onDetect])

	const toggle = () => {
		if (isScanning) {
			scannerRef.current?.stop()
			setIsScanning(false)
		} else {
			setScanError('')
			setIsScanning(true)
		}
	}

	const stop = () => {
		scannerRef.current?.stop()
		setIsScanning(false)
	}

	return { isScanning, scanError, videoRef, toggle, stop }
}