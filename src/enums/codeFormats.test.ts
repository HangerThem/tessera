import { BarcodeFormat as ZXingFormat } from '@zxing/library'
import { describe, expect, it } from 'vitest'

import { BarcodeFormat, QRCodeFormat } from './codeFormats'

describe('code formats', () => {
  it("use ZXing's ids, which cards and backups store", () => {
    for (const formats of [BarcodeFormat, QRCodeFormat]) {
      for (const [name, id] of Object.entries(formats)) {
        if (typeof id === 'number')
          expect(id, name).toBe(ZXingFormat[name as keyof typeof ZXingFormat])
      }
    }
  })
})
