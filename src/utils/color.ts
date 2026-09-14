/**
 * Returns a contrasting color (black or white) based on the provided hex color.
 *
 * @param hex - The hex color code (e.g., '#ff0000').
 * @returns A contrasting color ('#000' for black or '#fff' for white).
 */
export function contrastColor(hex: string) {
  const isDark = isDarkColor(hex)
  return isDark ? '#fff' : '#000'
}

/**
 * Determines if a given hex color is considered dark.
 *
 * @param hex - The hex color code (e.g., '#ff0000').
 * @returns A boolean indicating if the color is dark (true) or light (false).
 */
export function isDarkColor(hex: string) {
  const color = hex.replace('#', '')
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)

  return (r * 299 + g * 587 + b * 114) / 1000 <= 128
}
