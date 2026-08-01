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
        version: '1.6.1',
        highlights: [
            'Import PDFs, not just images — every page becomes fully editable',
            'Choose Images or PDF before importing, if you turn that on in Settings',
            'Drag pages to reorder them directly in the workspace grid',
            'You\'ll now see a prompt the moment a new version is ready, instead of finding out later',
        ],
    },
]