/**
 * Hands a file to the user: through the share sheet where the browser can share files (so it can be
 * saved to Files, Drive or sent on), otherwise as a download.
 *
 * @param {File} file - The file to save.
 */
export async function saveFile(file: File): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return
    } catch (err) {
      // The user closed the share sheet.
      if ((err as DOMException).name === 'AbortError') return
      // Chrome on Android says it can share any file, then refuses types it doesn't allow, like
      // JSON. Download it instead.
      console.warn('Sharing the file failed, downloading it instead:', err)
    }
  }

  download(file)
}

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  // Revoked on the next task, once the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url))
}
