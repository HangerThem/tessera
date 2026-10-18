import { Camera, Trash2 } from 'lucide-preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

import type { Point } from '../utils/perspective'

import { cropCard, defaultCorners, findCardInPhoto, loadPhoto, resizePhoto } from '../utils/image'
import { PhotoCropper } from './PhotoCropper'
import { Button } from './ui/Button'

type Cropping = {
  file: File
  bitmap: ImageBitmap
  url: string
  corners: Point[]
  detected: boolean
}

interface Props {
  /** The photo shown, if any. */
  photo: Blob | undefined
  /** Called with the resized photo, or null when it's removed. */
  onChange: (photo: Blob | null) => void
}

/**
 * Takes or picks a photo of the card, then crops it to the card and straightens it, or uses it
 * whole. The photo is shown with options to replace or remove it.
 */
export function PhotoField({ photo, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const [isResizing, setIsResizing] = useState(false)
  const [cropping, setCropping] = useState<Cropping | null>(null)
  const url = useMemo(() => photo && URL.createObjectURL(photo), [photo])

  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  const fail = (err: unknown) => {
    console.error('Preparing the photo failed:', err)
    setError("This photo couldn't be used. Try another one.")
  }

  const handleChosen = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    // Cleared so choosing the same photo again still fires a change.
    input.value = ''
    if (!file) return

    setError(undefined)
    setIsResizing(true)
    try {
      const bitmap = await loadPhoto(file)
      const found = findCardInPhoto(bitmap)
      setCropping({
        file,
        bitmap,
        url: URL.createObjectURL(file),
        corners: found ?? defaultCorners(bitmap.width, bitmap.height),
        detected: found !== null,
      })
    } catch (err) {
      fail(err)
    } finally {
      setIsResizing(false)
    }
  }

  const finishCropping = async (makePhoto?: (current: Cropping) => Promise<Blob>) => {
    const current = cropping!
    setCropping(null)
    try {
      if (makePhoto) {
        setIsResizing(true)
        onChange(await makePhoto(current))
      }
    } catch (err) {
      fail(err)
    } finally {
      setIsResizing(false)
      current.bitmap.close()
      URL.revokeObjectURL(current.url)
    }
  }

  if (cropping) {
    return (
      <PhotoCropper
        imageUrl={cropping.url}
        imageWidth={cropping.bitmap.width}
        imageHeight={cropping.bitmap.height}
        initialCorners={cropping.corners}
        detected={cropping.detected}
        onConfirm={(corners) => finishCropping((current) => cropCard(current.bitmap, corners))}
        onUseWholePhoto={() => finishCropping((current) => resizePhoto(current.file))}
        onCancel={() => finishCropping()}
      />
    )
  }

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-medium text-foreground/70">
        Photo of the card
        <span className="text-foreground/50 text-xs ml-1">(optional)</span>
      </legend>
      {/* Lets the phone offer the camera or the photo library. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => handleChosen(e.currentTarget)}
      />
      {url && (
        <img src={url} alt="Card photo" className="max-h-40 w-fit rounded-md object-contain" />
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          disabled={isResizing}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          {photo ? 'Replace photo' : 'Add photo'}
        </Button>
        {photo && (
          <Button type="button" variant="secondary" size="small" onClick={() => onChange(null)}>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Remove photo
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-500 text-xs">
          {error}
        </p>
      )}
    </fieldset>
  )
}
