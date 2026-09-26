# Changelog

All notable changes to Bindery are documented here. This project follows
[Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) — every
release below adds functionality or fixes bugs without breaking existing
usage, so all of them are `MINOR` or `PATCH` bumps against the `1.0.0`
baseline.

## [2.1.0]

### Added

- **Hover feedback on segmented controls** — unselected options in every segmented row (Settings sections and the Properties panel) now highlight when hovered; the selected option and disabled rows are unchanged
- **Hover animations** — buttons across the app now animate smoothly on hover instead of switching instantly: the sign-in dialog (eye icons, tabs, submit glow, Forgot/Back to log in, Copy button with a pop on click), Settings → Account (the same eye-icon and Copy animations, plus a growing glow on Sign in, Update password, and Generate Codes / Regenerate, and a color-matched glow on Sign out and Delete Account), and Settings → App's Install App button (now CSS-driven instead of JS -- glow only, no lift -- so it can no longer get stuck if installation starts mid-hover)
- **Light-red hover on close buttons** — the close (X) button in Settings, the sign-in dialog, and the session-recovery prompt now fades to a soft red on hover instead of the neutral grey

### Changed

- The **custom cursor** now replaces the pointer hand on every clickable element — buttons, links, toggles, dropdown options, command-palette items, and the page items in the sidebar — instead of only the default arrow. Disabled, locked, and mid-drag elements keep their own cursors. It is defined in a single block in `index.css`, so removing that block restores the browser's normal cursors everywhere
- The **Quality slider** in the Properties panel is now custom-drawn (same accent-colored fill and thumb) so its hover glow and brightness fade in smoothly instead of switching instantly
- The browser's native right-click menu is now disabled throughout the app, including in text fields; Bindery's own page menu (when enabled in Settings → Interface) is unaffected. Paste in text fields with `Ctrl+V` / `⌘V`
- **Session-recovery prompt** — "Restore Session" now has the same glowing hover as the sign-in dialog's submit button, and "Start Fresh" fades smoothly instead of switching instantly
- The **accent glow** used on button hovers (e.g. Log in, Back to log in) is now stronger in the light theme, where it was barely visible against the lighter background

- The **Import Images**, header **Export**, and header **Sign up** buttons no longer shift upward on hover; each shows a bigger glow, growing in smoothly (220ms) and evenly on all sides instead of snapping and leaning downward

- The header's **Export PDF** button now shows the custom cursor when enabled and a proper not-allowed cursor when disabled (empty project), instead of a plain pointer either way

- Settings → Account's **Update password**, **Generate Codes** / **Regenerate**, and **Delete Account** buttons now show a not-allowed cursor whenever they're actually disabled (e.g. an empty field), not just mid-action -- Delete Account's disabled state matched already, only its cursor style (plain arrow) was inconsistent with the rest, now aligned to not-allowed too

- **Fixed a real focus bug**: the session-recovery prompt listened for Enter/Escape globally even while the sign-in dialog was open on top of it, so pressing Enter to log in or sign up silently triggered "Restore Session" instead, and Log in / Sign up needed a manual click every time. The recovery prompt now steps aside while the sign-in dialog is open

- Settings → Storage's **Clear all data** button now has the same red glow hover as Delete Account, is CSS-driven instead of JS, and shows not-allowed while clearing instead of the plain arrow

- Settings → Appearance's page-list-style toggle (List / Grid preview cards) now highlights the non-selected option on hover instead of showing nothing

- The hover glow on Log in / Create account, Update password, Generate Codes, Sign out, Delete Account, Clear all data, and Restore Session now spreads evenly on all sides instead of leaning downward

- **Fixed a real bug**: Settings → Appearance's Light/Dark theme cards were disabled whenever "Follow system theme" was on (the default), so they couldn't be clicked at all, and their hover animation never showed for the same reason. Clicking either card now switches to it and turns off "Follow system theme" automatically, and the non-selected card's hover now also brightens its outline

- The theme cards' hover is now much more noticeable: a bigger lift, an accent-colored outline, and a soft glow, instead of a barely-visible 1px shift
- The **Install App** button in the install banner/toast (a third copy of this button, separate from the one in Settings → App) no longer shifts upward on hover; it now shows the same glow-only treatment

- The theme card's hover now also fades its background to a lighter shade, smoothly, alongside the lift/outline/glow
- The Install App glow (used by both the install banner and Settings → App) grows much more noticeably on hover now

- The header's round account icon (when logged in) now grows its glow on hover, instead of showing the same static ring always

### Fixed

- The grab cursor no longer appears in the workspace's single-page viewer at 100% zoom, where the page already fits and there is nothing to drag

## [2.0.0]

### Added

- **Crop tool** — a new "Crop Image" option in the right-click menu opens a dialog with a freeform or aspect-locked (Free / Square / Original) crop selection, resizable via 8 handles or by dragging the selection itself
- The crop dialog supports **zoom and pan** — scroll to zoom (centered on the cursor), or use the zoom controls below the stage; once zoomed in, drag the dimmed area outside the selection to pan
- **Apply as Copy** — a dropdown next to Apply Crop lets you crop into a duplicate page instead of replacing the original, so the source image is left untouched
- **Accounts** — sign up or log in from a new button in the header, with a combined login/signup dialog (including a confirm-password field on signup and show/hide toggles on password fields)
- **Settings sync** — two new buttons in Settings let you save your current settings to your account, or load them back on another device. Only fields that actually differ from local state are applied, so loading identical data is a genuine no-op. Sync is manual only — nothing uploads or downloads automatically, only when you click one of the two buttons
- **Account section** in Settings (new first item in the sidebar) — view and update your username and email (saved automatically when you leave the field), and change your password (requires your current password, plus a dedicated Update button)
- A backend server (Node/Express + MongoDB) now exists alongside the client, storing only account credentials and synced settings — no project or page data ever leaves the browser

### Fixed

- Right-clicking a page in the sidebar (List or Grid) now selects it first, so it's clear which page a multi-select action from the context menu will apply to; right-clicking within an existing multi-selection leaves the whole selection intact
- The right-click context menu (when enabled in Settings → Interface) now also works in Single-page and Continuous scroll view, not just the workspace Grid view — previously Single view had no context menu at all, and Continuous view had none either
- Right-clicking a page image, or the logo in the header and Settings → About, no longer shows the browser's native "Open image in new tab" menu

## [1.7.2]

### Added

- An **Instant** auto-save option (Settings → General) that saves shortly after every change instead of waiting for a fixed interval

### Fixed

- A very fast double-trigger of New Project (e.g. rapid double-press of `N`) could occasionally create two empty projects instead of one; project creation is now single-flight

## [1.7.1]

### Added

- A keyboard shortcut (`N`) to instantly start a new project

### Fixed

- Pressing New Project no longer creates a redundant empty project (and duplicate toast) when the current project was already blank and unsaved

## [1.7.0]

### Added

- A storage warning now appears once local usage crosses 90% of the browser's quota, with a "Clear Data" option that removes every other project while keeping the one currently open

### Fixed

- Deleting a project now also removes its recovery snapshots and export-history records, instead of leaving them behind in IndexedDB indefinitely
- The project switcher's Recent list showed a stale page count for the currently open project right after an import, until the next autosave
- The logo in the header and Settings → About failed to load when the app was opened offline, since the service worker never cached it

## [1.6.6]

### Fixed

- Reload dialog bug that would popup on startup in some scenarios.

## [1.6.5]

### Changed

- Refined the "What's New" dialog's More button with a softer, more gradual fade
- The highlights list no longer scrolls unless it's actually expanded

## [1.6.4]

### Fixed

- "Remove all" in Smart Scan not clearing blank pages it detected
- Smart Tools panel not showing when no page was selected
- Inconsistent spacing in the Page panel between the selected and empty states

## [1.6.3]

### Changed

- The "What's New" dialog now features a scroll bar for longer entries
- If the "What's New" dialog contains more than 5 entries, a More button accompanied by a downward-pointing arrow icon will appear beneath the final entry.

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
