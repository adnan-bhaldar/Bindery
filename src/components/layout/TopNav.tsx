import { memo, useState, useRef } from 'react'
import {
  ChevronDown, Undo2, Redo2, Download,
  PanelLeft, PanelRight,
  Settings, ScanText,
} from 'lucide-react'
import { useProjectStore, selectProjectName } from '@/stores/projectStore'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useExportStore } from '@/stores/exportStore'
import { useUIStore } from '@/stores/uiStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { ProjectDropdown } from '@/features/project/ProjectNameDialog'
import { APP_NAME } from '@/constants'

interface Props {
  onRunOCR: () => void
  onSettings: () => void
}

export const TopNav = memo(({ onRunOCR, onSettings }: Props) => {
  const name = useProjectStore(selectProjectName)
  const { isDirty } = useProjectStore()
  const { canUndo, canRedo, undo, redo } = useUndoRedo()
  const { openDialog: openExport } = useExportStore()
  const { togglePropertiesPanel, toggleSidebar, openCommandPalette } = useUIStore()
  const pageCount = usePagesStore(selectPageCount)

  const [dropdownAnchor, setDropdownAnchor] = useState<HTMLElement | null>(null)
  const projectBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <header className="topnav">
      {/* ── Left ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip content="Toggle sidebar" shortcut="⌘B" placement="bottom">
          <button className="icon-btn" onClick={toggleSidebar}>
            <PanelLeft size={15} />
          </button>
        </Tooltip>

        <span className="nav-sep" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="nav-logo-mark">
            <img
              src="/icons/favicon.svg"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          </div>
          <span className="nav-logo-text">{APP_NAME}</span>
        </div>

        <span className="nav-sep" />

        <Tooltip content="Project options" placement="bottom">
          <button
            ref={projectBtnRef}
            className="nav-project-btn"
            onClick={() => setDropdownAnchor(prev => prev ? null : projectBtnRef.current)}
          >
            <span className="nav-project-name">{name}</span>
            {isDirty && <span className="nav-dirty-dot" />}
            <ChevronDown
              size={11}
              color="var(--tx-3)"
              style={{
                transform: dropdownAnchor ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          </button>
        </Tooltip>

        <ProjectDropdown anchor={dropdownAnchor} onClose={() => setDropdownAnchor(null)} />
      </div>

      {/* ── Center ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <button className="nav-search" onClick={openCommandPalette}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--tx-3)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="nav-search-text">Search commands…</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
      </div>

      {/* ── Right ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip content="Undo" shortcut="⌘Z" placement="bottom">
          <button className="icon-btn" onClick={() => undo()} disabled={!canUndo()}>
            <Undo2 size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Redo" shortcut="⌘⇧Z" placement="bottom">
          <button className="icon-btn" onClick={() => redo()} disabled={!canRedo()}>
            <Redo2 size={14} />
          </button>
        </Tooltip>

        <span className="nav-sep" />

        <Tooltip content="Run OCR" placement="bottom">
          <button
            className="icon-btn"
            onClick={onRunOCR}
            disabled={pageCount === 0}
            style={{ opacity: pageCount === 0 ? 0.35 : 1 }}
          >
            <ScanText size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Settings" placement="bottom">
          <button className="icon-btn" onClick={onSettings}>
            <Settings size={14} />
          </button>
        </Tooltip>

        <span className="nav-sep" />

        <Tooltip content="Toggle properties" placement="bottom">
          <button className="icon-btn" onClick={togglePropertiesPanel}>
            <PanelRight size={14} />
          </button>
        </Tooltip>

        <span className="nav-sep" />

        <Tooltip content="Export to PDF" shortcut="⌘E" placement="bottom">
          <button className="nav-export-btn" onClick={openExport} disabled={pageCount === 0}
            style={{ opacity: pageCount === 0 ? 0.5 : 1 }}>
            <Download size={13} strokeWidth={2.5} />
            Export PDF
          </button>
        </Tooltip>
      </div>
    </header>
  )
})
TopNav.displayName = 'TopNav'