// ZXing's format ids, written out so the app doesn't load ZXing until it scans. Cards and backups
// store these numbers, so they must not change.

export enum BarcodeFormat {
  CODABAR = 1,
  CODE_39 = 2,
  CODE_93 = 3,
  CODE_128 = 4,
  EAN_8 = 6,
  EAN_13 = 7,
  ITF = 8,
  PDF_417 = 10,
  UPC_A = 14,
  UPC_E = 15,
}

/** Any format a card's code can be in. */
export type CodeFormat = BarcodeFormat | QRCodeFormat

export enum QRCodeFormat {
  AZTEC = 0,
  DATA_MATRIX = 5,
  QR_CODE = 11,
  MICRO_QR_CODE = 17,
  MAXICODE = 9,
}
