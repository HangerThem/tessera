import { describe, expect, it } from 'vitest'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { validateBarcodeValue } from './barcode'

describe('validateBarcodeValue', () => {
  it('accepts values that fit the format', () => {
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '4006381333931')).toBeUndefined()
    expect(validateBarcodeValue(BarcodeFormat.CODE_128, 'ABC-123')).toBeUndefined()
    expect(validateBarcodeValue(QRCodeFormat.QR_CODE, 'https://example.com')).toBeUndefined()
  })

  it('describes why a value does not fit the format', () => {
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '400638133393X')).toBe(
      'EAN-13 must contain only digits',
    )
    expect(validateBarcodeValue(BarcodeFormat.EAN_13, '4006381333932')).toBe(
      'Incorrect EAN-13 check digit provided',
    )
    expect(validateBarcodeValue(BarcodeFormat.EAN_8, '1234')).toBe('EAN-8 must be 7 or 8 digits')
  })
})
