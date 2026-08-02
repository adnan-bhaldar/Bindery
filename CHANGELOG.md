# Changelog

All notable changes to Bindery are documented here. This project follows
[Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) — every
release below adds functionality or fixes bugs without breaking existing
usage, so all of them are `MINOR` or `PATCH` bumps against the `1.0.0`
baseline.


## [1.6.2] 

### Changed

- Updated the logo shown in the install banner for a more polished appearance
- Added descriptive alt text to all logo images for improved accessibility

## [1.6.1] 

### Added
- A "What's New" dialog now appears once after updating to a new version,
  summarizing what changed

### Changed

- Redesigned the Images/PDF import chooser dialog with the app's premium
  visual language (gradient icon tiles, hover lift, staggered entrance)
- Moved the "Choose import type" setting from Appearance to Import, where
  it belongs

## [1.6.0] 

### Added

- **Import PDFs, not just images.** Every page of an imported PDF is
  rendered and becomes a fully editable page — reorder, rotate, delete,
  duplicate, adjust margins, OCR, all of it, exactly like a photo
- "Open Project" from a PDF file, starting a brand-new project from it
- An optional Images/PDF chooser shown before the file picker opens
  (off by default — Settings → Import)

### Removed

- The `.bindery` project file format (export/import) — superseded by
  direct PDF import as the way to bring existing documents into Bindery

## [1.5.0] 

### Added

- Scroll wheel now zooms directly in single-page view (previously
  required holding Ctrl/Cmd)

## [1.4.1] 

### Fixed

- Panning a zoomed-in page didn't actually move the image (a Framer
  Motion/CSS transform conflict silently discarded the pan offset)
- Panning could cancel itself the instant the cursor left the preview
  area — now tracked on the window instead of the container
- Panning could drag the image completely out of view even at 100% zoom
  or below; now properly clamped to the actual zoomed overflow
- Zoom controls in Grid/Continuous view are now disabled (not hidden),
  keeping the toolbar's layout stable across view modes
- Duplicate-page group stayed listed in Smart Scan after its pages were
  removed

## [1.4.0] 

### Added

- Recovery dialog: **Enter** restores the session, **Escape** starts fresh
- Image Fit and Margin controls in the Page panel now visually disable
  when Page Size is set to Auto, with an explanatory toast on interaction

## [1.3.1] 

### Fixed

- Dragging a page in the workspace grid felt janky with no real drag
  animation, wrong cursor, and could visually balloon a card to fill the
  entire row
- The Export tab's Page Margin setting had no effect on the actual
  preview or export (per-page margin silently took priority everywhere)
- Auto page size inconsistently showed a padded canvas in some places and
  not others — now unconditionally sized exactly to the image, no canvas
- Removed the Auto Sort (by filename/date) option from Smart Tools
- Removed Save, Open Project, Import, and the theme toggle icons from the
  top nav (still available via Command Palette and keyboard shortcuts)

## [1.3.0] 

### Added

- Drag pages to reorder them directly in the workspace grid, not just the
  sidebar — with a real drop-target preview and drag overlay
- Optional right-click context menu in the workspace (off by default —
  Settings → Interface)

## [1.2.1] 

### Changed

- Sidebar page view now defaults to Grid instead of List
- Theme now defaults to System instead of a hardcoded Dark
- New pages default to no margin instead of Medium

### Fixed

- The first-launch install banner now auto-dismisses after 3 seconds
  (previously stayed until manually closed)

## [1.2.0] 

### Added

- A premium inline import-progress view for brand-new projects, replacing
  the floating toast overlay in that specific case

### Changed

- OCR no longer runs automatically on import by default — it was
  intermittently getting stuck. Manual OCR remains available in Settings
- Empty (0-page) projects are now cleaned up automatically instead of
  cluttering the recents list

### Fixed

- OCR text could get stuck indefinitely with no error shown, caused by a
  redundant worker-inside-a-worker architecture around Tesseract.js
- Extracted OCR text couldn't be selected or copied

## [1.1.1] 

### Fixed

- Several project-tracking bugs where refreshing the page could reopen
  the wrong project instead of the one you were actually just using
- The recovery dialog didn't reliably offer to restore a session for new
  or manually-saved projects

## [1.1.0] 

### Added

- A popup notifying you when a new version is available, with a one-click
  reload — checked periodically and whenever the tab regains focus
- Automatic reload after clearing all local data in Settings

### Changed

- Autosave interval reduced from 30 seconds to 10 seconds

## [1.0.1] 

### Fixed

- Toolbox background was opaque instead of transparent, and could clip
  the page above it
- The project rename dropdown didn't close when clicking outside it
- Export progress bar and stage indicators could desync from each other
- Dragging images into the app had a visible flicker before settling
- The keyboard focus ring rendered as a hard rectangle instead of
  matching a rounded element's actual shape

## [1.0.0] 

Initial release.
