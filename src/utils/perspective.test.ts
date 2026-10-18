import { describe, expect, it } from 'vitest'

import { applyHomography, getHomography, type Point, warpPerspective } from './perspective'

const rectangle = (width: number, height: number): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
]

/** An RGBA image where each pixel's red channel is its x and green channel its y. */
function gradientImage(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data.set([x, y, 0, 255], i)
    }
  }
  return { data, width, height }
}

describe('getHomography', () => {
  it('maps each corner of one quadrilateral onto the other', () => {
    const skewed: Point[] = [
      { x: 12, y: 30 },
      { x: 210, y: 8 },
      { x: 240, y: 170 },
      { x: 5, y: 150 },
    ]
    const flat = rectangle(1000, 630)
    const homography = getHomography(flat, skewed)

    flat.forEach((corner, i) => {
      const mapped = applyHomography(homography, corner)
      expect(mapped.x).toBeCloseTo(skewed[i].x, 6)
      expect(mapped.y).toBeCloseTo(skewed[i].y, 6)
    })
  })
})

describe('warpPerspective', () => {
  it('copies the image when the corners are its own', () => {
    const image = gradientImage(20, 10)

    const warped = warpPerspective(image, rectangle(20, 10), 20, 10)

    // Pixel centres map onto pixel centres, so the copy is exact up to rounding.
    for (let i = 0; i < warped.length; i++)
      expect(Math.abs(warped[i] - image.data[i])).toBeLessThanOrEqual(1)
  })

  it('crops and stretches the area inside the corners to the output size', () => {
    const image = gradientImage(100, 100)
    const rightHalf: Point[] = [
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 50, y: 100 },
    ]

    const warped = warpPerspective(image, rightHalf, 10, 10)

    const reds = Array.from({ length: 10 }, (_, x) => warped[x * 4])
    expect(Math.min(...reds)).toBeGreaterThanOrEqual(50)
    expect(Math.max(...reds)).toBeLessThanOrEqual(99)
    expect(reds).toEqual(reds.toSorted((a, b) => a - b))
  })
})
