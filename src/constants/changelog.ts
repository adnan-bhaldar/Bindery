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
        version: '1.7.0',
        highlights: [
            'Deleting a project now also clears its recovery snapshots and export history, keeping storage usage lower',
            'Added a low-storage warning with a one-click way to clear old projects while keeping the one you have open',
            'Fixed the project switcher showing an outdated page count for the current project right after importing',
            'Fixed the logo not loading in the header and Settings when the app is opened offline',
        ],
    },
]