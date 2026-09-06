import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'

export const mapZXingFormatToBWIPJS = (format: BarcodeFormat | QRCodeFormat): string => {
  switch (format) {
    case QRCodeFormat.AZTEC:
      return 'azteccode'
    case BarcodeFormat.CODE_39:
      return 'code39'
    case BarcodeFormat.CODE_93:
      return 'code93'
    case BarcodeFormat.CODE_128:
      return 'code128'
    case QRCodeFormat.DATA_MATRIX:
      return 'datamatrix'
    case BarcodeFormat.EAN_8:
      return 'ean8'
    case BarcodeFormat.EAN_13:
      return 'ean13'
    case BarcodeFormat.ITF:
      return 'interleaved2of5'
    case QRCodeFormat.MAXICODE:
      return 'maxicode'
    case BarcodeFormat.PDF_417:
      return 'pdf417'
    case QRCodeFormat.QR_CODE:
      return 'qrcode'
    case QRCodeFormat.MICRO_QR_CODE:
      return 'microqrcode'
    default:
      throw new Error(`Unsupported barcode format: ${format}`)
  }
}
