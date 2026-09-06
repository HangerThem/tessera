import { BarcodeFormat as BarcodeFormatZxing } from '@zxing/library'

export enum BarcodeFormat {
  AZTEC = BarcodeFormatZxing.AZTEC,
  CODE_39 = BarcodeFormatZxing.CODE_39,
  CODE_93 = BarcodeFormatZxing.CODE_93,
  CODE_128 = BarcodeFormatZxing.CODE_128,
  DATA_MATRIX = BarcodeFormatZxing.DATA_MATRIX,
  EAN_8 = BarcodeFormatZxing.EAN_8,
  EAN_13 = BarcodeFormatZxing.EAN_13,
  ITF = BarcodeFormatZxing.ITF,
  MAXICODE = BarcodeFormatZxing.MAXICODE,
  PDF_417 = BarcodeFormatZxing.PDF_417,
  QR_CODE = BarcodeFormatZxing.QR_CODE,
  MICRO_QR_CODE = BarcodeFormatZxing.MICRO_QR_CODE,
}
