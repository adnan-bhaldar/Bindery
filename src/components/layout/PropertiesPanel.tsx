import { memo } from 'react'
import { SlidersHorizontal, Download, FileText, Scan } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { SmartScanPanel } from '@/features/smart/SmartScanPanel'
import { cn } from '@/lib/utils'
import type { PropertiesPanelTab } from '@/types'

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
  const isSelected = useSelectionStore(s => s.selectedIds.size > 0)

  if (!isSelected) {
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
      <div>
        <p className="section-label">Image Fit</p>
        <SegRow
          options={[{ value: 'fit', label: 'Fit' }, { value: 'fill', label: 'Fill' }, { value: 'original', label: 'Original' }, { value: 'stretch', label: 'Stretch' }]}
          value="fit" onChange={() => { }}
        />
      </div>
      <div>
        <p className="section-label">Margin</p>
        <SegRow
          options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]}
          value="medium" onChange={() => { }}
        />
      </div>
      <div>
        <p className="section-label">Smart Tools</p>
        <SmartScanPanel />
      </div>
    </div>
  )
})
PageTab.displayName = 'PageTab'

/* ── Export tab ────────────────────────────────────────────────────── */
const ExportTab = memo(() => (
  <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div>
      <p className="section-label">Page Size</p>
      <SegRow
        options={[{ value: 'auto', label: 'Auto' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a3', label: 'A3' }]}
        value="a4" onChange={() => { }}
      />
    </div>
    <div>
      <p className="section-label">Orientation</p>
      <SegRow
        options={[{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]}
        value="auto" onChange={() => { }}
      />
    </div>
    <div>
      <p className="section-label">Quality</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--font-mono)' }}>50%</span>
        <input type="range" min={50} max={100} defaultValue={95}
          style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--font-mono)' }}>Max</span>
      </div>
    </div>
  </div>
))
ExportTab.displayName = 'ExportTab'

/* ── Metadata tab ───────────────────────────────────────────────────── */
const MetaTab = memo(() => (
  <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[
      { label: 'Title', placeholder: 'Untitled Document' },
      { label: 'Author', placeholder: 'Your name' },
      { label: 'Subject', placeholder: 'Document subject' },
      { label: 'Keywords', placeholder: 'tag, another tag…' },
      { label: 'Copyright', placeholder: '© 2025' },
    ].map(({ label, placeholder }) => (
      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="section-label">{label}</p>
        <input className="panel-input" placeholder={placeholder} />
      </div>
    ))}
  </div>
))
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