/**
 * Hashes a string using the DJB2 algorithm.
 * 
 * @param str The string to hash.
 * @returns The hash value as a number.
 */
export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}