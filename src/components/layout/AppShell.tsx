import { useShallow } from 'zustand/react/shallow'
import { memo, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { TopNav } from './TopNav'
import { Sidebar } from './Sidebar'
import { Workspace } from './Workspace'
import { PropertiesPanel } from './PropertiesPanel'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ImportProgressOverlay } from '@/features/import/ImportProgress'
import { ExportDialog } from '@/features/export/ExportDialog'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { OCRProgressPanel } from '@/features/ocr/OCRProgressPanel'
import { useTheme } from '@/hooks/useTheme'
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

export const AppShell = memo(() => {
  useTheme()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const { isImporting, progress: importProgress, importFiles, importFromPicker } = useImport()
  const { progress: ocrProgress, runOCR, cancelOCR } = useOCR()

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
      await projectService.saveProject(currentProject, pages)
      setCurrentProject({ ...currentProject, status: 'saved' })
      markSaved()
      toast.success('Project saved')
    } catch {
      toast.error('Failed to save project')
    }
  }, [currentProject, pages, setCurrentProject, markSaved])

  // ── Open file handler ────────────────────────────────────────────────────────
  const handleOpenFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.bindery'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const result = await projectService.importProjectFile(file)
        setCurrentProject(result.project)
        suppressNextDirtyFlag(); setPages(result.pages)
        toast.success(`Opened "${result.project.name}"`)
      } catch {
        toast.error('Invalid .bindery file')
      }
    }
    input.click()
  }, [setCurrentProject, setPages])

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
      await projectService.saveRecoverySnapshot(currentProject.id, pages.length)
      await projectService.saveProject(currentProject, pages)
      setCurrentProject({ ...currentProject, status: 'saved' })
      markSaved()
    } catch (err) {
      console.warn('[AutoSave] failed:', err)
    }
  }, [currentProject, pages, setCurrentProject, markSaved])

  useAutoSave(handleAutoSave)

  const { settings } = useSettingsStore()

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
      <TopNav
        onImport={importFromPicker}
        onSettings={() => setSettingsOpen(true)}
        onRunOCR={() => void runOCR()}
        onSave={handleSave}
        onOpenFile={handleOpenFile}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar onImport={importFromPicker} />
        <Workspace onImport={importFromPicker} isImporting={isImporting} onDrop={handleImportFiles} />
        <PropertiesPanel />
      </div>

      <CommandPalette
        onOpenSettings={() => setSettingsOpen(true)}
        onRunOCR={() => void runOCR()}
        onImport={importFromPicker}
        onSave={handleSave}
        onNewProject={handleNewProject}
        onOpenFile={handleOpenFile}
      />
      <ImportProgressOverlay progress={importProgress} isVisible={isImporting} />
      <OCRProgressPanel progress={ocrProgress} onCancel={cancelOCR} />
      <ExportDialog />
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
})
AppShell.displayName = 'AppShell'
