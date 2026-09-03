import { BarcodeFormat } from "@zxing/library";

export const mapZXingFormatToBWIPJS = (format: BarcodeFormat): string => {
	switch (format) {
		case BarcodeFormat.AZTEC:
			return "azteccode";
		case BarcodeFormat.CODE_39:
			return "code39";
		case BarcodeFormat.CODE_93:
			return "code93";
		case BarcodeFormat.CODE_128:
			return "code128";
		case BarcodeFormat.DATA_MATRIX:
			return "datamatrix";
		case BarcodeFormat.EAN_8:
			return "ean8";
		case BarcodeFormat.EAN_13:
			return "ean13";
		case BarcodeFormat.ITF:
			return "interleaved2of5";
		case BarcodeFormat.MAXICODE:
			return "maxicode";
		case BarcodeFormat.PDF_417:
			return "pdf417";
		case BarcodeFormat.QR_CODE:
			return "qrcode";
		case BarcodeFormat.MICRO_QR_CODE:
			return "microqrcode";
		default:
			throw new Error(`Unsupported barcode format: ${format}`);
	}
}