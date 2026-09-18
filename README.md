# Tessera

A simple, privacy-first loyalty and membership card manager. Scan your physical cards once, then pull them up at checkout, no account, no ads, no data leaving your device.

**[Try it →](https://tessera.hhu.cz)**

![Lighthouse Report](https://lighthouse-report-svg.vercel.app/?perf=99&acc=100&best=100&seo=100&pwa=4)

---

## Features

- **Scan & save** — scan the barcode or QR code from any physical loyalty card using your camera
- **Manual entry** — type in the card number and select the format if scanning isn't an option
- **Digital wallet** — display your card as a barcode or QR code for scanning at checkout
- **Favorites** — star cards to mark the ones you use most
- **Fuzzy search** — find cards by name or card number
- **Share** — share the card number as text or the barcode as an image (where supported by the browser)
- **Copy** — copy the raw card value to clipboard in one tap
- **Offline support** — works without a connection once installed
- **Private by design** — all data stored locally on your device via IndexedDB; nothing leaves your browser

## Supported Formats

**Barcodes:** Code 39, Code 93, Code 128, EAN-8, EAN-13, ITF, PDF-417

**2D codes:** QR Code, Micro QR Code, Aztec, Data Matrix, MaxiCode

## Installation

Tessera is a PWA, no app store required. Open [tessera.hhu.cz](https://tessera.hhu.cz) in your browser and install it from the address bar or browser menu.

## Self-hosting

```bash
git clone https://github.com/HangerThem/tessera
cd tessera
bun install
bun run build
```

Serve the `dist/` folder with any static host (Nginx, Caddy, Coolify, etc.).

## Tech Stack

|                   |                        |
| ----------------- | ---------------------- |
| Framework         | Preact + Vite          |
| Language          | TypeScript             |
| Barcode scanning  | ZXing                  |
| Barcode rendering | BWIP-JS                |
| Storage           | IDB-Keyval (IndexedDB) |
| Styling           | Tailwind CSS v4        |
| Icons             | Lucide                 |

## License

MIT
