/** * Formats a value to a more human-readable label by replacing underscores with spaces and capitalizing the first letter of each word.
 * 
 * @param {string} key - The value to be formatted into a label.
 * @returns {string} The formatted label with spaces and capitalized words.
 */
export function formatToLabel(key: string): string {
	return key.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())
}