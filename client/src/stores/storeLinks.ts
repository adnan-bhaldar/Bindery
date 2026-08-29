import { usePagesStore } from './pagesStore'
import { useProjectStore } from './projectStore'

// ─── Cross-store wiring ───────────────────────────────────────────────────────
// Whenever the pages array reference changes (any mutation: add, remove, rotate,
// reorder, duplicate, set cover, set margin, set fit, set thumbnail, set OCR text),
// mark the current project as dirty so auto-save and the unsaved-changes indicator
// in the TopNav both pick it up.
//
// Loading a project (open/restore/recovery) also replaces the pages array via
// setPages(), which would otherwise immediately flag the freshly-loaded project
// as dirty. To avoid that false positive, callers should call suppressNextDirty()
// right before setPages() when loading — see usage in AppShell, ProjectPanel,
// ProjectNameDialog, and RecoveryDialog.
//
// Imported once from main.tsx so the subscription is established at app startup.

let isFirstRun = true
let suppressNext = false

export function suppressNextDirtyFlag() {
  suppressNext = true
}

usePagesStore.subscribe((state) => state.pages, () => {
  if (isFirstRun) {
    isFirstRun = false
    return
  }

  if (suppressNext) {
    suppressNext = false
    return
  }

  const { currentProject, isDirty, setDirty } = useProjectStore.getState()
  if (currentProject && !isDirty) {
    setDirty(true)
  }
})
