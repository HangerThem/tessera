# Changelog

## [v0.4.0] - 2026-10-18

### Added

- Card export / backup for device migration (#53)


- Transfer cards directly to another device (#54)


- Add notes to cards (#63)


- Sort cards by recently used (#64)


- Add an optional photo of the card (#65)



### Chores

- Merge AddCardForm and EditCardForm into a shared CardForm (#55)



### Fixed

- "Share as Image" does nothing (#49)


- Invalid barcode values render an empty card (#50)


- Barcodes render blurry on high-DPI screens (#51)


- Card list shadows have square corners (#60)


- Cards without a picked colour can't be saved after editing (#56)


- Scanning UPC or Codabar cards saves them with the wrong format (#57)


- Scanned QR code cards are displayed as Code 128 (#58)


- Card list icon isn't at the right edge on iPad (#67)


- App shows a blank screen if storage fails to load (#61)


- iOS purges IndexedDB every 7 days (#62)

## [v0.3.0] - 2026-10-17

### Added

- Add back button (#16)


- Better card creation/edit UI/UX (#18)


- Better camera flow with error handling and manual entry fallback (#19)


- Add a theme switcher (#40)


- Show a prompt when an app update is available (#47)



### Chores

- Update packages (#17)


- Run lint, typecheck, tests and build in CI on pull requests (#38)


- Code cleanup (#39)



### Fixed

- Fix favorite icon color respects dark/light (#15)


- Light theme flashes on startup in dark mode (#42)


- Bundle the font instead of loading it from Google Fonts (#43)


- Back button and Escape close one screen at a time (#44)


- Edit form close button is labelled "Close add card form" (#45)


- Improve PWA manifest and installability (#46)


## [v0.2.0] - 2026-09-23

### Added

- BarcodeDetector API support (#9)


## [v0.1.0] - 2026-09-22

### Added

- Clean card adding form


- Form closes on submit



### Changed

- Better navigation system and search


- State management to allow more precise manipulation


- Migration to Preact



### Chores

- Working favicon


- Updated oxfmt and oxlint


- Add lighthouse report


- Add license


- Release v0.1.0



### Fixed

- Unsued var


