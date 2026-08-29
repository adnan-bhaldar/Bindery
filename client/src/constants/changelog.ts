// Only the entry matching the current package.json version is ever shown
// in the in-app "What's new" dialog (see useWhatsNew.ts) — keep this in
// sync with the top ("latest") entry in CHANGELOG.md. Highlights should be
// short, user-facing bullet points, not a full technical changelog.

export interface ChangelogEntry {
    version: string
    highlights: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '2.0.0',
        highlights: [
            'New: crop images right from the page context menu, with zoom and pan to fine-tune the selection',
            'New: "Apply as Copy" in the crop dialog crops into a duplicate page, leaving the original untouched',
            'New: sign up or log in from the header — Bindery now has accounts',
            'New: save your settings to your account and load them on another device, from two new buttons in Settings',
            'New: an Account section in Settings for managing your username, email, and password',
            'Fixed: right-clicking a page now selects it, and the context menu now works in Single-page and Continuous scroll view',
        ],
    },
]