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
        version: '1.6.5',
        highlights: [
            'Polished the "What\'s New" dialog with a smoother fade above the More button',
            'Fixed the highlights list scrolling even when nothing was collapsed',
        ],
    },
]