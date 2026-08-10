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
        version: '1.7.2',
        highlights: [
            'Added an Instant auto-save option that saves shortly after every change instead of on a fixed timer',
            'Fixed a rare case where a very fast double New Project could create two empty projects instead of one',
        ],
    },
]