import { describe, expect, it } from 'vitest'

import type { Point } from './perspective'

import { detectCardCorners } from './cardDetection'
import { createPRNG } from './prng'

const WIDTH = 400
const HEIGHT = 300

const isInside = (point: Point, polygon: Point[]) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

type RGB = [number, number, number]

/**
 * An RGBA "photo": a card on a noisy background, with a few lines of text on the card. By default
 * a light card on a darker background.
 */
function photo(
  card: Point[] | null,
  cardColour: RGB = [215, 215, 215],
  background: RGB = [70, 70, 70],
) {
  const random = createPRNG(42)
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4)
  const paint = (i: number, [r, g, b]: RGB, noise = 0) =>
    pixels.set([r + noise, g + noise, b + noise, 255], i * 4)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const onCard = card !== null && isInside({ x: x + 0.5, y: y + 0.5 }, card)
      paint(y * WIDTH + x, onCard ? cardColour : background, (random() - 0.5) * 30)
    }
  }
  if (card) {
    // Dark "text" lines inside the card, which shouldn't be mistaken for its edges.
    const [tl, tr, , bl] = card
    for (const t of [0.3, 0.45, 0.6]) {
      for (let s = 0.15; s < 0.6; s += 0.002) {
        const x = Math.round(tl.x + (tr.x - tl.x) * s + (bl.x - tl.x) * t)
        const y = Math.round(tl.y + (tr.y - tl.y) * s + (bl.y - tl.y) * t)
        for (let dy = 0; dy < 3; dy++) paint((y + dy) * WIDTH + x, [40, 40, 40])
      }
    }
  }
  return { data: pixels, width: WIDTH, height: HEIGHT }
}

function expectCorners(found: Point[] | null, expected: Point[]) {
  expect(found).not.toBeNull()
  found!.forEach((corner, i) => {
    expect(Math.hypot(corner.x - expected[i].x, corner.y - expected[i].y)).toBeLessThan(5)
  })
}

const rotated = (degrees: number): Point[] => {
  const angle = (degrees * Math.PI) / 180
  const [cx, cy, halfWidth, halfHeight] = [200, 150, 140, 88]
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([x, y]) => ({
    x: cx + x * Math.cos(angle) - y * Math.sin(angle),
    y: cy + x * Math.sin(angle) + y * Math.cos(angle),
  }))
}

describe('detectCardCorners', () => {
  it('finds a straight card, top-left corner first', () => {
    const card = [
      { x: 60, y: 62 },
      { x: 340, y: 62 },
      { x: 340, y: 238 },
      { x: 60, y: 238 },
    ]

    expectCorners(detectCardCorners(photo(card)), card)
  })

  it('finds a rotated card', () => {
    const card = rotated(12)

    expectCorners(detectCardCorners(photo(card)), card)
  })

  it('finds a card photographed at an angle', () => {
    const card = [
      { x: 90, y: 70 },
      { x: 330, y: 48 },
      { x: 360, y: 250 },
      { x: 40, y: 228 },
    ]

    expectCorners(detectCardCorners(photo(card)), card)
  })

  it('finds a card that only differs from the background in colour, not brightness', () => {
    const card = rotated(-8)
    // A dark blue card on brown: about the same brightness in grayscale.
    const blue: RGB = [30, 58, 138]
    const brown: RGB = [91, 70, 54]

    expectCorners(detectCardCorners(photo(card, blue, brown)), card)
  })

  it('finds nothing in a photo without a card', () => {
    expect(detectCardCorners(photo(null))).toBeNull()
  })

  it('ignores shapes too small to be the card', () => {
    const small = [
      { x: 180, y: 140 },
      { x: 230, y: 140 },
      { x: 230, y: 170 },
      { x: 180, y: 170 },
    ]

    expect(detectCardCorners(photo(small))).toBeNull()
  })
})
