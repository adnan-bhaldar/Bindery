import { memo } from 'react'
import { Files, FolderOpen, ImagePlus } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { VirtualizedPageList } from '@/features/pages/VirtualizedPageList'
import { ProjectPanel } from '@/features/project/ProjectPanel'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import type { SidebarTab } from '@/types'

// The first page always acts as the cover — no separate cover-selection UI.
// See pagesStore: isCover is force-set to (index === 0) on every mutation
// that can change page order (add/remove/reorder/sort).
const TABS: { id: SidebarTab; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'pages', label: 'Pages', Icon: Files },
  { id: 'project', label: 'Project', Icon: FolderOpen },
]

interface Props { onImport: () => void }

export const Sidebar = memo(({ onImport }: Props) => {
  const { isSidebarOpen, sidebarTab, setSidebarTab } = useUIStore()
  const pageCount = usePagesStore(selectPageCount)
  if (!isSidebarOpen) return null

  return (
    <aside className="sidebar">
      {/* Tab strip */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <div className="seg-control">
          {TABS.map(({ id, label, Icon }) => (
            <Tooltip key={id} content={label} placement="bottom">
              <button
                className={cn('seg-tab', sidebarTab === id && 'active')}
                onClick={() => setSidebarTab(id)}
              >
                <Icon size={12} strokeWidth={sidebarTab === id ? 2.5 : 2} />
                {label}
                {id === 'pages' && pageCount > 0 && (
                  <span className="tab-count">{pageCount}</span>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {sidebarTab === 'pages' && (
          pageCount > 0
            ? <VirtualizedPageList />
            : <SidebarEmpty
              icon={<Files size={22} strokeWidth={1.5} />}
              title="No pages yet"
              desc="Drop images anywhere or click Import"
              onImport={onImport}
            />
        )}
        {sidebarTab === 'project' && <ProjectPanel />}
      </div>
    </aside>
  )
})
Sidebar.displayName = 'Sidebar'

const SidebarEmpty = memo(({ icon, title, desc, onImport }: {
  icon: React.ReactNode; title: string; desc: string; onImport?: () => void
}) => (
  <div className="sidebar-empty">
    <div className="sidebar-empty-icon">{icon}</div>
    <p className="sidebar-empty-title">{title}</p>
    <p className="sidebar-empty-desc">{desc}</p>
    {onImport && (
      <button className="sidebar-import-btn" onClick={onImport}>
        <ImagePlus size={13} strokeWidth={2} />
        Import Images
      </button>
    )}
  </div>
))
SidebarEmpty.displayName = 'SidebarEmpty'