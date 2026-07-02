import { useCallback } from 'react'
import { useHistoryStore } from '@/stores/historyStore'
import { suppressNextDirtyFlag } from '@/stores/storeLinks'
import { usePagesStore } from '@/stores/pagesStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { toast } from 'sonner'

export function useUndoRedo() {
  // All primitives or stable function refs — no new-reference issue
  const historyUndo = useHistoryStore(s => s.undo)
  const historyRedo = useHistoryStore(s => s.redo)
  const canUndo = useHistoryStore(s => s.canUndo)
  const canRedo = useHistoryStore(s => s.canRedo)
  const cursor = useHistoryStore(s => s.cursor)   // number — stable comparison
  const setPages = usePagesStore(s => s.setPages)
  const deselectAll = useSelectionStore(s => s.deselectAll)

  const undo = useCallback(() => {
    // Read entries fresh at call time — no subscription to the entries array
    const { entries } = useHistoryStore.getState()
    const snapshot = historyUndo()
    if (snapshot === null) return
    const undoneEntry = entries[cursor]  // cursor still points to the entry before undo moves it
    suppressNextDirtyFlag()
    setPages(snapshot)
    deselectAll()
    if (undoneEntry) toast.info(`Undid: ${undoneEntry.description}`)
  }, [historyUndo, cursor, setPages, deselectAll])

  const redo = useCallback(() => {
    const { entries } = useHistoryStore.getState()
    const snapshot = historyRedo()
    if (snapshot === null) return
    const redoneEntry = entries[cursor + 1]
    suppressNextDirtyFlag()
    setPages(snapshot)
    deselectAll()
    if (redoneEntry) toast.info(`Redid: ${redoneEntry.description}`)
  }, [historyRedo, cursor, setPages, deselectAll])

  return { undo, redo, canUndo, canRedo }
}


