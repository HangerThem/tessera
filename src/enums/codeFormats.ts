import { BarcodeFormat as BarcodeFormatZxing } from '@zxing/library'

export enum BarcodeFormat {
  CODE_39 = BarcodeFormatZxing.CODE_39,
  CODE_93 = BarcodeFormatZxing.CODE_93,
  CODE_128 = BarcodeFormatZxing.CODE_128,
  EAN_8 = BarcodeFormatZxing.EAN_8,
  EAN_13 = BarcodeFormatZxing.EAN_13,
  ITF = BarcodeFormatZxing.ITF,
  PDF_417 = BarcodeFormatZxing.PDF_417,
}

export enum QRCodeFormat {
  AZTEC = BarcodeFormatZxing.AZTEC,
  DATA_MATRIX = BarcodeFormatZxing.DATA_MATRIX,
  QR_CODE = BarcodeFormatZxing.QR_CODE,
  MICRO_QR_CODE = BarcodeFormatZxing.MICRO_QR_CODE,
  MAXICODE = BarcodeFormatZxing.MAXICODE,
}
