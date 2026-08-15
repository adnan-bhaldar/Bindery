import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ─── State & Actions ──────────────────────────────────────────────────────────

interface SelectionState {
    selectedIds: Set<string>
    lastSelectedId: string | null
    anchorId: string | null
}

interface SelectionActions {
    select: (id: string) => void
    selectOnly: (id: string) => void
    selectRange: (ids: string[], anchorId: string, targetId: string) => void
    selectAll: (ids: string[]) => void
    toggle: (id: string) => void
    deselect: (id: string) => void
    deselectAll: () => void
    setAnchor: (id: string) => void
    isSelected: (id: string) => boolean
}

type SelectionStore = SelectionState & SelectionActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
    selectedIds: new Set(),
    lastSelectedId: null,
    anchorId: null,

    select: (id) =>
        set((state) => ({ selectedIds: new Set([...state.selectedIds, id]), lastSelectedId: id })),

    selectOnly: (id) =>
        set({ selectedIds: new Set([id]), lastSelectedId: id, anchorId: id }),

    selectRange: (allIds, anchorId, targetId) => {
        const ai = allIds.indexOf(anchorId)
        const ti = allIds.indexOf(targetId)
        if (ai === -1 || ti === -1) return
        const start = Math.min(ai, ti)
        const end = Math.max(ai, ti)
        set({ selectedIds: new Set(allIds.slice(start, end + 1)), lastSelectedId: targetId })
    },

    selectAll: (ids) =>
        set({ selectedIds: new Set(ids), lastSelectedId: ids[ids.length - 1] ?? null }),

    toggle: (id) =>
        set((state) => {
            const next = new Set(state.selectedIds)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return { selectedIds: next, lastSelectedId: id }
        }),

    deselect: (id) =>
        set((state) => {
            const next = new Set(state.selectedIds)
            next.delete(id)
            return { selectedIds: next }
        }),

    deselectAll: () =>
        set({ selectedIds: new Set(), lastSelectedId: null, anchorId: null }),

    setAnchor: (id) => set({ anchorId: id }),

    isSelected: (id) => get().selectedIds.has(id),
}))

// ─── Safe primitive selectors (no new references) ────────────────────────────

// These return primitives — safe to use directly with useSelectionStore()
export const selectSelectedCount = (state: SelectionStore): number =>
    state.selectedIds.size

export const selectHasSelection = (state: SelectionStore): boolean =>
    state.selectedIds.size > 0

// ─── Hooks for derived data that would create new references ─────────────────

// Use this instead of selectSelectedIdsArray — uses useShallow to stabilise
export function useSelectedIdsArray(): string[] {
    return useSelectionStore(
        useShallow((state) => Array.from(state.selectedIds))
    )
}

// Use this for the selected IDs as a Set — compares by size + membership
export function useSelectedIds(): Set<string> {
    return useSelectionStore((state) => state.selectedIds)
}