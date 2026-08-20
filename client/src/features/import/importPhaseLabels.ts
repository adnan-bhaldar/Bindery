import type { ImportProgress as IProgress } from '@/services/importService'

// Extracted from ImportProgress.tsx — that file exports a component only
// now, so Fast Refresh works correctly there (mixing a constant export into
// a component file breaks it, per react-refresh/only-export-components).

export const PHASE_LABELS: Record<IProgress['phase'], string> = {
    validating: 'Checking files…',
    'rendering-pdf': 'Rendering PDF pages…',
    hashing: 'Checking for duplicates…',
    thumbnails: 'Processing images…',
    saving: 'Saving…',
    done: 'Done',
}
