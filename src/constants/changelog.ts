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
        version: '1.7.1',
        highlights: [
            'Added a keyboard shortcut (N) to start a new project instantly',
            'Fixed New Project creating a redundant empty project and toast when the current one was already blank',
        ],
    },
]