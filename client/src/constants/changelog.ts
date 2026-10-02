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
        version: '2.7.3',
        highlights: [
            'Fixed: the custom cursor is re-applied right after the file picker closes',
            'Fixed: Restore Session showed a plain pointer instead of not-allowed while restoring',
        ],
    },
]
