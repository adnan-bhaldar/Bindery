import { create } from 'zustand'
import type { HistoryEntry, HistoryActionType } from '@/types'
import { generateId } from '@/lib/utils'

const MAX_HISTORY = 50

// ─── State & Actions ──────────────────────────────────────────────────────────

interface HistoryState {
    entries: HistoryEntry[]
    cursor: number // points to current state (-1 = empty)
}

interface HistoryActions {
    push: (
        type: HistoryActionType,
        description: string,
        before: unknown,
        after: unknown
    ) => void
    undo: () => HistoryEntry | null
    redo: () => HistoryEntry | null
    clear: () => void
    canUndo: () => boolean
    canRedo: () => boolean
}

type HistoryStore = HistoryState & HistoryActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    entries: [],
    cursor: -1,

    // ── Actions ────────────────────────────────────────────────────────────────

    push: (type, description, before, after) => {
        const { entries, cursor } = get()
        const entry: HistoryEntry = {
            id: generateId(),
            type,
            description,
            timestamp: Date.now(),
            before,
            after,
        }

        // Truncate forward history when branching
        const newEntries = [...entries.slice(0, cursor + 1), entry].slice(
            -MAX_HISTORY
        )
        set({ entries: newEntries, cursor: newEntries.length - 1 })
    },

    undo: () => {
        const { entries, cursor } = get()
        if (cursor < 0) return null
        set({ cursor: cursor - 1 })
        return entries[cursor]
    },

    redo: () => {
        const { entries, cursor } = get()
        if (cursor >= entries.length - 1) return null
        set({ cursor: cursor + 1 })
        return entries[cursor + 1]
    },

    clear: () => set({ entries: [], cursor: -1 }),

    canUndo: () => get().cursor >= 0,

    canRedo: () => get().cursor < get().entries.length - 1,
}))