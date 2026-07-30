import { useShallow } from 'zustand/react/shallow'
import { memo, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { TopNav } from './TopNav'
import { Sidebar } from './Sidebar'
import { Workspace } from './Workspace'
import { PropertiesPanel } from './PropertiesPanel'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ImportProgressOverlay } from '@/features/import/ImportProgress'
import { ImportTypeDialog } from '@/features/import/ImportTypeDialog'
import { ExportDialog } from '@/features/export/ExportDialog'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { OCRProgressPanel } from '@/features/ocr/OCRProgressPanel'
import { useTheme } from '@/hooks/useTheme'
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useImport } from '@/hooks/useImport'
import { useOCR } from '@/hooks/useOCR'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useGlobalDropZone } from '@/hooks/useDropZone'
import { useProjectStore } from '@/stores/projectStore'
import { usePagesStore } from '@/stores/pagesStore'
import { projectService } from '@/services/projectService'
import { useSettingsStore } from '@/stores/settingsStore'
import { suppressNextDirtyFlag } from '@/stores/storeLinks'
import { SmallScreenNotice } from '@/components/common/SmallScreenNotice'

export const AppShell = memo(() => {
  useTheme()
  useAccessibilitySettings()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    isImporting, progress: importProgress, importFiles, importFromPicker,
    showImportChooser, chooseImportImages, chooseImportPdf, cancelImportChooser,
  } = useImport()
  const { progress: ocrProgress, runOCR, cancelOCR } = useOCR()
  const { settings } = useSettingsStore()

  const { setCurrentProject, markSaved } = useProjectStore(
    useShallow(s => ({ setCurrentProject: s.setCurrentProject, markSaved: s.markSaved }))
  )
  const currentProject = useProjectStore(s => s.currentProject)
  const pages = usePagesStore(s => s.pages)
  const setPages = usePagesStore(s => s.setPages)

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!currentProject) {
      toast.info('Nothing to save yet — import some images first')
      return
    }
    try {
      if (pages.length > 0) {
        await projectService.saveRecoverySnapshot(currentProject.id, pages.length, settings.maxRecoverySnapshots)
      }
      await projectService.saveProject(currentProject, pages)
      setCurrentProject({ ...currentProject, status: 'saved' })
      markSaved()
      toast.success('Project saved')
    } catch {
      toast.error('Failed to save project')
    }
  }, [currentProject, pages, setCurrentProject, markSaved, settings.maxRecoverySnapshots])

  const handleNewProject = useCallback(async () => {
    const project = await projectService.createProject()
    suppressNextDirtyFlag()
    setPages([])
    setCurrentProject(project)
    toast.success('New project created')
  }, [setPages, setCurrentProject])

  useKeyboardShortcuts({ onImport: importFromPicker, onSave: handleSave })

  // ── Auto-save ────────────────────────────────────────────────────────────────
  const handleAutoSave = useCallback(async () => {
    // useAutoSave already gates this call on isDirty + currentProject existing,
    // so by the time we get here we know there is unsaved work to persist.
    if (!currentProject || pages.length === 0) return
    try {
      await projectService.saveRecoverySnapshot(currentProject.id, pages.length, settings.maxRecoverySnapshots)
      await projectService.saveProject(currentProject, pages)
      setCurrentProject({ ...currentProject, status: 'saved' })
      markSaved()
    } catch (err) {
      console.warn('[AutoSave] failed:', err)
    }
  }, [currentProject, pages, setCurrentProject, markSaved])

  useAutoSave(handleAutoSave)

  const handleImportFiles = useCallback((files: File[]) => {
    const pagesBefore = usePagesStore.getState().pages.length
    void importFiles(files).then(() => {
      // Auto-run OCR on newly imported pages if setting is enabled
      if (settings.ocrEnabled && settings.autoRunOcr) {
        const pagesAfter = usePagesStore.getState().pages
        const newPages = pagesAfter.slice(pagesBefore)
        if (newPages.length > 0) {
          void runOCR(newPages)
        }
      }
    })
  }, [importFiles, settings.ocrEnabled, settings.autoRunOcr, runOCR])

  // Accept drops anywhere on the page, not just in the workspace
  useGlobalDropZone(handleImportFiles)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--bg-app)',
    }}>
      <SmallScreenNotice />

      <TopNav
        onSettings={() => setSettingsOpen(true)}
        onRunOCR={() => void runOCR()}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar onImport={importFromPicker} />
        <Workspace onImport={importFromPicker} isImporting={isImporting} onDrop={handleImportFiles} importProgress={importProgress} />
        <PropertiesPanel />
      </div>

      <CommandPalette
        onOpenSettings={() => setSettingsOpen(true)}
        onRunOCR={() => void runOCR()}
        onImport={importFromPicker}
        onSave={handleSave}
        onNewProject={handleNewProject}
      />
      <ImportProgressOverlay progress={importProgress} isVisible={isImporting && pages.length > 0} />
      <ImportTypeDialog
        open={showImportChooser}
        onChooseImages={chooseImportImages}
        onChoosePdf={chooseImportPdf}
        onClose={cancelImportChooser}
      />
      <OCRProgressPanel progress={ocrProgress} onCancel={cancelOCR} />
      <ExportDialog />
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
})
AppShell.displayName = 'AppShell'