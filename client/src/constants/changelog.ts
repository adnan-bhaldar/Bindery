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
        version: '2.7.1',
        highlights: [
            'Fixed: the grab cursor no longer shows in the workspace viewer at 100% zoom',
            "Fixed: Light/Dark theme cards couldn't be clicked while 'Follow system theme' was on",
            'Changed: theme card hover is now much more noticeable (lift, outline, glow, background fade)',
            'Changed: the List/Grid view toggles (Appearance and the sidebar) now highlight on hover',
            'Changed: Import Images, Export, Sign up, and Install App no longer shift on hover, just glow',
            'Changed: the header account icon and several buttons now glow evenly on all sides on hover',
            'Changed: Export PDF, Update password, Generate Codes, and Delete Account show the right cursor when disabled',
            'Changed: the hover glow is stronger in the light theme, where it was hard to see',
            'Fixed: a focus bug where the recovery prompt hijacked Enter/Escape from the sign-in dialog',
            'Changed: Restore Session and Start Fresh now have smooth, glowing hover animations',
            'Changed: Clear all data now has the same red glow hover as Delete Account',
            'New: hover animations throughout the sign-in dialog (eye icons, tabs, submit glow, links, Copy)',
            'New: matching hover animations in Settings → Account',
            'Changed: Install App is now CSS-driven instead of JS, so it can no longer get stuck on hover',
            'New: hover feedback on unselected options in every segmented control',
            'New: close buttons fade to light red on hover instead of neutral grey',
            'Changed: the Quality slider is now custom-drawn so its hover fades in smoothly',
            'New: a custom cursor now replaces the pointer hand on every button, link, toggle, and dropdown',
            "Changed: the browser's right-click menu no longer appears in the app — use Ctrl+V (⌘V) to paste in text fields",
        ],
    },
]