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
        version: '1.6.4',
        highlights: [
            'Fixed "Remove all" not working for blank pages detected by Smart Scan',
            'Smart Tools is now available even when no page is selected',
            'Fixed inconsistent spacing in the Page panel between selected and empty states',
        ],
    },
]