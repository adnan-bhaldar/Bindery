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
        version: '2.1.0',
        highlights: [
            'New: a custom cursor now replaces the pointer hand on every button, link, toggle, and dropdown',
            'New: smoother hover animations across the sign-in dialog, Account, App, and recovery-prompt buttons',
            'New: close buttons turn light red on hover, and Copy-code buttons animate on hover and click',
            'Changed: the browser\'s right-click menu no longer appears in the app — use Ctrl+V (⌘V) to paste in text fields',
            'Fixed: Light/Dark theme selection was blocked whenever \'Follow system theme\' was on; plus cursor, glow, and hover polish',
        ],
    },
]