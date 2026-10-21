import { describe, expect, it } from 'vitest'

import { BarcodeFormat } from '../enums/codeFormats'
import {
  formatBarcodeValue,
  mapBarcodeDetectorFormatToZXing,
  mapZXingFormatsToBarcodeDetectorFormats,
} from './barcode'

describe('UPC and Codabar', () => {
  it('maps the formats to and from the native barcode detector', () => {
    expect(
      mapZXingFormatsToBarcodeDetectorFormats([
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODABAR,
      ]),
    ).toEqual(['upc_a', 'upc_e', 'codabar'])
    expect(mapBarcodeDetectorFormatToZXing('upc_a')).toBe(BarcodeFormat.UPC_A)
    expect(mapBarcodeDetectorFormatToZXing('codabar')).toBe(BarcodeFormat.CODABAR)
  })

  it('groups UPC-A digits like the printed number', () => {
    expect(formatBarcodeValue(BarcodeFormat.UPC_A, '036000291452')).toBe('0 36000 29145 2')
  })
})
