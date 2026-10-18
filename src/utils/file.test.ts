import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveFile } from './file'

const file = new File(['{}'], 'tessera-backup-2026-10-18.json', { type: 'application/json' })

describe('saveFile', () => {
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() })
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.assign(navigator, { share: undefined, canShare: undefined })
  })

  it('downloads the file when sharing is refused', async () => {
    // Chrome on Android says it can share any file, then refuses types it doesn't allow, like JSON.
    const share = vi.fn(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError')
    })
    Object.assign(navigator, { share, canShare: () => true })

    await saveFile(file)

    expect(share).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(file.name)
  })

  it("doesn't download when the user closes the share sheet", async () => {
    const share = vi.fn(async () => {
      throw new DOMException('Share canceled', 'AbortError')
    })
    Object.assign(navigator, { share, canShare: () => true })

    await saveFile(file)

    expect(click).not.toHaveBeenCalled()
  })
})
