import { memo, useCallback, useState } from 'react'
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
import { useProjectStore } from '@/stores/projectStore'
import { usePagesStore } from '@/stores/pagesStore'
import { projectService } from '@/services/projectService'

export const AppShell = memo(() => {
  useTheme()
  useKeyboardShortcuts()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const { isImporting, progress: importProgress, importFiles, importFromPicker } = useImport()
  const { progress: ocrProgress, runOCR, cancelOCR } = useOCR()

  const { currentProject, setCurrentProject, markSaved } = useProjectStore()
  const pages = usePagesStore(s => s.pages)

  // Auto-save handler — saves recovery snapshot every 30s
  const handleAutoSave = useCallback(async () => {
    if (!currentProject || pages.length === 0) return
    try {
      await projectService.saveRecoverySnapshot(currentProject.id, pages.length)
      // Full save if project has been modified
      if (currentProject.status === 'modified' || currentProject.status === 'new') {
        await projectService.saveProject(currentProject, pages)
        setCurrentProject({ ...currentProject, status: 'saved' })
        markSaved()
      }
    } catch (err) {
      console.warn('[AutoSave] failed:', err)
    }
  }, [currentProject, pages, setCurrentProject, markSaved])

  useAutoSave(handleAutoSave)

  const handleImportFiles = useCallback((files: File[]) => {
    void importFiles(files)
  }, [importFiles])

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
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar onImport={importFromPicker} />
        <Workspace onImport={importFromPicker} isImporting={isImporting} onDrop={handleImportFiles} />
        <PropertiesPanel />
      </div>

      {/* Global overlays — order matters for z-index stacking */}
      <CommandPalette
        onOpenSettings={() => setSettingsOpen(true)}
        onRunOCR={() => void runOCR()}
        onImport={importFromPicker}
      />
      <ImportProgressOverlay progress={importProgress} isVisible={isImporting} />
      <OCRProgressPanel progress={ocrProgress} onCancel={cancelOCR} />
      <ExportDialog />
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
})
AppShell.displayName = 'AppShell'
