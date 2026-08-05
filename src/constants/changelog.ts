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
        version: '1.6.3',
        highlights: [
            'A "What\'s New" summary now appears after an update, showing what changed',
            'Refreshed the install banner with an updated app logo',
            'Added alt text to all logo images to improve accessibility',
            'If there are more than 5 entries, a More button with a down arrow will appear below the last entry.'
        ],
    },
]