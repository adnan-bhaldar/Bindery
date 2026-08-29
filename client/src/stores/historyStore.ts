import { create } from 'zustand'
import type { HistoryActionType, Page } from '@/types'
import { generateId } from '@/lib/utils'

const MAX_HISTORY = 50

// ─── Snapshot-based history ───────────────────────────────────────────────────
// Each entry stores a full snapshot of the pages array before the action.
// Undo restores the previous snapshot; redo restores the next one.
// This is simpler and far more reliable than diffing partial before/after state.

export interface HistoryEntry {
    id: string
    type: HistoryActionType
    description: string
    timestamp: number
    pagesBefore: Page[]
    pagesAfter: Page[]
}

interface HistoryState {
    entries: HistoryEntry[]
    cursor: number // index of the last applied entry; -1 = nothing done yet
}

interface HistoryActions {
    /** Record a snapshot transition. Call AFTER the mutation has already happened. */
    push: (type: HistoryActionType, description: string, pagesBefore: Page[], pagesAfter: Page[]) => void
    /** Returns the pages snapshot to restore, or null if nothing to undo */
    undo: () => Page[] | null
    /** Returns the pages snapshot to restore, or null if nothing to redo */
    redo: () => Page[] | null
    clear: () => void
    canUndo: () => boolean
    canRedo: () => boolean
}

type HistoryStore = HistoryState & HistoryActions

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
    entries: [],
    cursor: -1,

    push: (type, description, pagesBefore, pagesAfter) => {
        const { entries, cursor } = get()
        const entry: HistoryEntry = {
            id: generateId(),
            type,
            description,
            timestamp: Date.now(),
            pagesBefore,
            pagesAfter,
        }
        // Truncate any "future" (redo) entries when a new action branches off
        const newEntries = [...entries.slice(0, cursor + 1), entry].slice(-MAX_HISTORY)
        set({ entries: newEntries, cursor: newEntries.length - 1 })
    },

    undo: () => {
        const { entries, cursor } = get()
        if (cursor < 0) return null
        const entry = entries[cursor]
        set({ cursor: cursor - 1 })
        return entry.pagesBefore
    },

    redo: () => {
        const { entries, cursor } = get()
        if (cursor >= entries.length - 1) return null
        const entry = entries[cursor + 1]
        set({ cursor: cursor + 1 })
        return entry.pagesAfter
    },

    clear: () => set({ entries: [], cursor: -1 }),

    canUndo: () => get().cursor >= 0,
    canRedo: () => get().cursor < get().entries.length - 1,
}))
