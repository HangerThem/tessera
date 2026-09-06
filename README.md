# Tessera

A simple, privacy-first loyalty and membership card manager. Scan your physical cards once, then pull them up at checkout - no account, no ads, no data leaving your device.

**[Try it →](https://tessera.hhu.cz)**

---

## Features

- **Scan & save** - scan the barcode or QR code from any physical loyalty card
- **Digital wallet** - display your card's code for scanning at checkout
- **Offline support** - works without a connection once installed
- **Private by design** - all data stored locally in your browser via IndexedDB

## Installation

Tessera is a PWA. Open [tessera.hhu.cz](https://tessera.hhu.cz) in your browser and install it from the address bar or browser menu - no app store required.

## Self-hosting

```bash
git clone https://github.com/HangerThem/tessera
cd tessera
bun install
bun run build
```

Serve the `dist/` folder with any static host (Nginx, Caddy, Coolify, etc.).

## Tech Stack

| | |
|---|---|
| Framework | Preact + Vite |
| Language | TypeScript |
| Barcode scanning | ZXing |
| Barcode rendering | BWIP-JS |
| Storage | IDB-Keyval (IndexedDB) |
| Icons | Lucide |

## License

MIT