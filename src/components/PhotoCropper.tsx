import { useRef, useState } from 'preact/hooks'

import type { Point } from '../utils/perspective'

import { Button } from './ui/Button'

interface Props {
  imageUrl: string
  /** The photo's size in pixels; corners are in the same pixels. */
  imageWidth: number
  imageHeight: number
  initialCorners: Point[]
  /** Whether the corners were found in the photo, rather than placed near its edges. */
  detected: boolean
  onConfirm: (corners: Point[]) => void
  onUseWholePhoto: () => void
  onCancel: () => void
}

const CORNER_NAMES = [
  'Top-left corner',
  'Top-right corner',
  'Bottom-right corner',
  'Bottom-left corner',
]

/** Arrow keys move a corner by 1% of the photo, or 5% with Shift. */
const KEY_STEP = 0.01
const SHIFT_KEY_STEP = 0.05

const KEY_DIRECTIONS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

/**
 * Shows a photo with four draggable corners, to mark the card for cropping and straightening.
 * The corners start on the detected card, or near the photo's edges if none was found.
 */
export function PhotoCropper({
  imageUrl,
  imageWidth,
  imageHeight,
  initialCorners,
  detected,
  onConfirm,
  onUseWholePhoto,
  onCancel,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [corners, setCorners] = useState(initialCorners)
  const [dragging, setDragging] = useState<number | null>(null)

  const clamp = ({ x, y }: Point): Point => ({
    x: Math.min(Math.max(x, 0), imageWidth),
    y: Math.min(Math.max(y, 0), imageHeight),
  })

  const moveCorner = (index: number, point: Point) =>
    setCorners((current) => current.map((corner, i) => (i === index ? clamp(point) : corner)))

  const toPhotoPoint = (clientX: number, clientY: number): Point => {
    const frame = frameRef.current!.getBoundingClientRect()
    return {
      x: ((clientX - frame.left) / frame.width) * imageWidth,
      y: ((clientY - frame.top) / frame.height) * imageHeight,
    }
  }

  const handleKeyDown = (index: number, event: KeyboardEvent) => {
    const direction = KEY_DIRECTIONS[event.key]
    if (!direction) return
    event.preventDefault()
    const step = event.shiftKey ? SHIFT_KEY_STEP : KEY_STEP
    const corner = corners[index]
    moveCorner(index, {
      x: corner.x + direction.x * step * imageWidth,
      y: corner.y + direction.y * step * imageHeight,
    })
  }

  const outline = corners.map(({ x, y }) => `${x},${y}`).join(' ')

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70">
        {detected
          ? "Drag the corners onto the card's corners if they're off."
          : "Tessera couldn't find the card. Drag the corners onto its corners."}
      </p>
      {/* Holding a corner shouldn't open the long-press menu, select the photo or scroll. */}
      <div
        ref={frameRef}
        data-crop-frame
        className="relative no-touch-callout touch-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={imageUrl}
          alt=""
          className="block w-full rounded-md pointer-events-none"
          draggable={false}
        />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Dims everything outside the card. */}
          <path
            d={`M0,0 H${imageWidth} V${imageHeight} H0 Z M${outline.replaceAll(' ', ' L')} Z`}
            fill="rgba(0,0,0,0.45)"
            fillRule="evenodd"
          />
          <polygon
            points={outline}
            fill="none"
            stroke="white"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {corners.map((corner, index) => (
          <button
            key={CORNER_NAMES[index]}
            type="button"
            aria-label={CORNER_NAMES[index]}
            className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/30 shadow cursor-grab touch-none ${dragging === index ? 'scale-125' : ''}`}
            style={{
              left: `${(corner.x / imageWidth) * 100}%`,
              top: `${(corner.y / imageHeight) * 100}%`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId)
              setDragging(index)
            }}
            onPointerMove={(e) => {
              if (dragging !== index) return
              moveCorner(index, toPhotoPoint(e.clientX, e.clientY))
            }}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
            onKeyDown={(e) => handleKeyDown(index, e)}
          />
        ))}
      </div>
      <Button type="button" onClick={() => onConfirm(corners)}>
        Use photo
      </Button>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="small" onClick={onUseWholePhoto}>
          Use whole photo
        </Button>
        <Button type="button" variant="secondary" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
