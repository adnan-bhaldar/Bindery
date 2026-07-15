import { memo, useCallback } from 'react'
import { SlidersHorizontal, Download, FileText, Copy } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useSelectedIdsArray } from '@/stores/selectionStore'
import { useShallow } from 'zustand/react/shallow'
import { usePagesStore } from '@/stores/pagesStore'
import { useExportStore, useActivePreset } from '@/stores/exportStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from 'sonner'
import { SmartScanPanel } from '@/features/smart/SmartScanPanel'
import { cn } from '@/lib/utils'
import type { PropertiesPanelTab, ImageFit, PageMargin, PageSize, PageOrientation, CompressionQuality } from '@/types'

const TABS: { id: PropertiesPanelTab; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'page', label: 'Page', Icon: SlidersHorizontal },
  { id: 'export', label: 'Export', Icon: Download },
  { id: 'metadata', label: 'Info', Icon: FileText },
]

const SegRow = ({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) => (
  <div style={{ display: 'flex', background: 'var(--s3)', borderRadius: 8, padding: 3, gap: 2 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        flex: 1, padding: '5px 4px', borderRadius: 6, border: 'none',
        background: value === o.value ? 'var(--bg-card)' : 'transparent',
        color: value === o.value ? 'var(--tx-1)' : 'var(--tx-3)',
        fontSize: 11, fontWeight: value === o.value ? 600 : 400,
        fontFamily: 'var(--font-sans)', cursor: 'pointer',
        boxShadow: value === o.value ? 'var(--sh-xs)' : 'none',
        transition: 'all 110ms', whiteSpace: 'nowrap',
      }}>
        {o.label}
      </button>
    ))}
  </div>
)

/* ── Page tab ──────────────────────────────────────────────────────── */
const PageTab = memo(() => {
  const selectedIds = useSelectedIdsArray()
  const pages = usePagesStore(s => s.pages)
  const { setPageImageFit, setPageMargin } = usePagesStore(
    useShallow(s => ({ setPageImageFit: s.setPageImageFit, setPageMargin: s.setPageMargin }))
  )

  const hasSelection = selectedIds.length > 0
  const firstSelected = selectedIds.length > 0 ? pages.find(p => p.id === selectedIds[0]) : null

  const applyToSelection = useCallback((fn: (id: string) => void) => {
    selectedIds.forEach(fn)
  }, [selectedIds])

  if (!hasSelection || !firstSelected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 220, padding: '0 16px', textAlign: 'center' }}>
        <div className="sidebar-empty-icon">
          <SlidersHorizontal size={16} strokeWidth={1.5} color="var(--tx-3)" />
        </div>
        <p className="sidebar-empty-title">No page selected</p>
        <p className="sidebar-empty-desc">Select a page to adjust its properties</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {selectedIds.length > 1 && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          fontSize: 11, color: 'var(--accent)', fontWeight: 500,
        }}>
          Editing {selectedIds.length} pages
        </div>
      )}

      <div>
        <p className="section-label">Image Fit</p>
        <SegRow
          options={[{ value: 'fit', label: 'Fit' }, { value: 'fill', label: 'Fill' }, { value: 'original', label: 'Original' }, { value: 'stretch', label: 'Stretch' }]}
          value={firstSelected.imageFit}
          onChange={v => applyToSelection(id => setPageImageFit(id, v as ImageFit))}
        />
      </div>
      <div>
        <p className="section-label">Margin</p>
        <SegRow
          options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]}
          value={firstSelected.margin}
          onChange={v => applyToSelection(id => setPageMargin(id, v as PageMargin))}
        />
      </div>
      {selectedIds.length === 1 && firstSelected.ocrText && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p className="section-label" style={{ margin: 0 }}>OCR Text</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(firstSelected.ocrText ?? '')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--tx-3)',
                fontSize: 10.5, cursor: 'pointer',
                transition: 'background 110ms, color 110ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--tx-1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' }}
            >
              <Copy size={10} />
              Copy
            </button>
          </div>
          <div style={{
            maxHeight: 160, overflowY: 'auto',
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--s3)', border: '1px solid var(--border)',
            fontSize: 11, color: 'var(--tx-2)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {firstSelected.ocrText}
          </div>
        </div>
      )}

      <div>
        <p className="section-label">Smart Tools</p>
        <SmartScanPanel />
      </div>
    </div>
  )
})
PageTab.displayName = 'PageTab'

/* ── Export tab ────────────────────────────────────────────────────── */
const ExportTab = memo(() => {
  const preset = useActivePreset()
  const { updatePreset } = useExportStore()

  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p className="section-label">Page Size</p>
        <SegRow
          options={[{ value: 'auto', label: 'Auto' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a3', label: 'A3' }]}
          value={preset.pageSize}
          onChange={v => updatePreset(preset.id, { pageSize: v as PageSize })}
        />
      </div>
      <div>
        <p className="section-label">Orientation</p>
        <SegRow
          options={[{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]}
          value={preset.orientation}
          onChange={v => updatePreset(preset.id, { orientation: v as PageOrientation })}
        />
      </div>
      <div>
        <p className="section-label">Page Margin</p>
        <SegRow
          options={[
            { value: 'none', label: 'None' },
            { value: 'small', label: 'Narrow' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Wide' },
          ]}
          value={preset.margin}
          onChange={v => updatePreset(preset.id, { margin: v as PageMargin })}
        />
      </div>
      <div>
        <p className="section-label">Quality</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--font-mono)' }}>50%</span>
          <input
            type="range" min={50} max={100}
            value={preset.compression === 'original' ? 100 : preset.compression}
            onChange={e => updatePreset(preset.id, { compression: Number(e.target.value) as CompressionQuality })}
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--font-mono)' }}>Max</span>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--tx-3)', marginTop: 6, textAlign: 'center' }}>
          {preset.compression === 'original' ? 'Original quality' : `${preset.compression}% quality`}
        </p>
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--tx-4)', lineHeight: 1.5 }}>
        These are quick adjustments to the active preset ({preset.name}).
        Open the Export dialog (⌘E) for full controls.
      </p>
    </div>
  )
})
ExportTab.displayName = 'ExportTab'

/* ── Metadata tab ───────────────────────────────────────────────────── */
const MetaTab = memo(() => {
  const { currentProject, updateMetadata } = useProjectStore()
  const { settings } = useSettingsStore()
  const metadata = currentProject?.metadata

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 220, padding: '0 16px', textAlign: 'center' }}>
        <div className="sidebar-empty-icon">
          <FileText size={16} strokeWidth={1.5} color="var(--tx-3)" />
        </div>
        <p className="sidebar-empty-title">No project open</p>
        <p className="sidebar-empty-desc">Import images to start a project</p>
      </div>
    )
  }

  const hasRealProjectName = !!currentProject.name && currentProject.name !== 'Untitled Project'
  // The title field shows the project's own name as its real value (not a
  // placeholder) whenever no explicit title has been typed. Whether it's
  // actually editable is controlled ENTIRELY by Settings → Export → "Allow
  // custom document title" — there's no in-panel way to change that toggle
  // anymore, so this is just a straight read of the current setting value.
  const showingProjectNameFallback = !metadata?.title && hasRealProjectName
  const titleIsReadOnly = showingProjectNameFallback && !settings.allowCustomDocumentTitle

  const handleLockedTitleClick = useCallback(() => {
    if (!titleIsReadOnly) return
    toast.info('Matches the project name.', {
      description: 'Custom titles are off in Settings → Export.',
      duration: 2500,
    })
  }, [titleIsReadOnly])

  const fields: { key: keyof NonNullable<typeof metadata>; label: string; placeholder: string }[] = [
    { key: 'title', label: 'Title', placeholder: hasRealProjectName ? currentProject.name : 'Untitled Document' },
    { key: 'author', label: 'Author', placeholder: 'Your name' },
    { key: 'subject', label: 'Subject', placeholder: 'Document subject' },
    { key: 'keywords', label: 'Keywords', placeholder: 'tag, another tag…' },
    { key: 'copyright', label: 'Copyright', placeholder: `© ${new Date().getFullYear()}` },
  ]

  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fields.map(({ key, label, placeholder }) => {
        const displayValue = key === 'title' && showingProjectNameFallback
          ? currentProject.name
          : metadata?.[key] ?? ''
        const isLockedTitle = key === 'title' && titleIsReadOnly

        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="section-label">{label}</p>
            <input
              className="panel-input"
              placeholder={placeholder}
              value={displayValue}
              readOnly={isLockedTitle}
              onChange={e => updateMetadata({ [key]: e.target.value })}
              onClick={isLockedTitle ? handleLockedTitleClick : undefined}
              style={isLockedTitle ? { color: 'var(--tx-3)', cursor: 'default' } : undefined}
            />
          </div>
        )
      })}
    </div>
  )
})
MetaTab.displayName = 'MetaTab'

/* ── PropertiesPanel ────────────────────────────────────────────────── */
export const PropertiesPanel = memo(() => {
  const { isPropertiesPanelOpen, propertiesPanelTab, setPropertiesPanelTab } = useUIStore()
  if (!isPropertiesPanelOpen) return null

  return (
    <aside className="panel">
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <div className="seg-control">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={cn('seg-tab', propertiesPanelTab === id && 'active')}
              onClick={() => setPropertiesPanelTab(id)}
            >
              <Icon size={12} strokeWidth={propertiesPanelTab === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {propertiesPanelTab === 'page' && <PageTab />}
        {propertiesPanelTab === 'export' && <ExportTab />}
        {propertiesPanelTab === 'metadata' && <MetaTab />}
      </div>
    </aside>
  )
})
PropertiesPanel.displayName = 'PropertiesPanel'