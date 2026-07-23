import { useShallow } from 'zustand/react/shallow'
import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, FolderOpen, Plus, Clock, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService, formatProjectDate } from '@/services/projectService'
import { usePagesStore } from '@/stores/pagesStore'
import { toast } from 'sonner'
import type { Project } from '@/types'
import { suppressNextDirtyFlag } from '@/stores/storeLinks'

interface Props {
  anchor: HTMLElement | null
  onClose: () => void
}

export const ProjectDropdown = memo(({ anchor, onClose }: Props) => {
  const [name, setName] = useState('')
  const [recents, setRecents] = useState<Project[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { currentProject, setCurrentProject } = useProjectStore()
  const { setPages, clearPages } = usePagesStore(
    useShallow(s => ({ setPages: s.setPages, clearPages: s.clearPages }))
  )


  useEffect(() => {
    if (!anchor) return
    setName(currentProject?.name ?? 'Untitled Project')
    projectService.getRecentProjects().then(setRecents)
    setTimeout(() => inputRef.current?.select(), 60)
  }, [anchor, currentProject])

  // Position below anchor
  const pos = anchor ? (() => {
    const r = anchor.getBoundingClientRect()
    return { top: r.bottom + 6, left: r.left }
  })() : { top: 0, left: 0 }

  const handleRename = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentProject?.name) { onClose(); return }
    if (currentProject) {
      const updated = { ...currentProject, name: trimmed, updatedAt: Date.now() }
      setCurrentProject(updated)
      try { await projectService.saveProject(updated, usePagesStore.getState().pages) } catch { }
      toast.success(`Renamed to "${trimmed}"`)
    } else {
      const project = await projectService.createProject(trimmed)
      setCurrentProject(project)
    }
    onClose()
  }, [name, currentProject, setCurrentProject, onClose])

  const handleNew = useCallback(async () => {
    const project = await projectService.createProject()
    suppressNextDirtyFlag()
    clearPages()
    setCurrentProject(project)
    toast.success('New project created')
    onClose()
  }, [clearPages, setCurrentProject, onClose])

  const handleOpen = useCallback(async (project: Project) => {
    try {
      const result = await projectService.loadProject(project.id)
      if (!result) { toast.error('Project not found'); return }
      setCurrentProject(result.project)
      suppressNextDirtyFlag(); setPages(result.pages)
      toast.success(`Opened "${result.project.name}"`)
    } catch { toast.error('Failed to open project') }
    onClose()
  }, [setCurrentProject, setPages, onClose])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await projectService.deleteProject(id)
    setRecents(r => r.filter(p => p.id !== id))
    toast.success('Removed from recents')
  }, [])

  return createPortal(
    <AnimatePresence>
      {anchor && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 900 }}
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 901,
              width: 280,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-hard)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--sh-xl)',
              overflow: 'hidden',
            }}
          >
            {/* Rename field */}
            <div style={{ padding: '12px 12px 10px' }}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--tx-4)',
                textTransform: 'uppercase', letterSpacing: '0.7px',
                marginBottom: 7,
              }}>
                Project Name
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={inputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') onClose()
                  }}
                  style={{
                    flex: 1, padding: '7px 10px',
                    background: 'var(--s3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--tx-1)',
                    fontSize: 13, fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'border-color 110ms, box-shadow 110ms',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  placeholder="Project name"
                />
                <button
                  onClick={handleRename}
                  style={{
                    width: 34, height: 34, flexShrink: 0,
                    borderRadius: 'var(--r-md)', border: 'none',
                    background: 'var(--accent)',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 110ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* New project */}
            <button
              onClick={handleNew}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', border: 'none', background: 'transparent',
                color: 'var(--tx-2)', fontSize: 12.5, fontFamily: 'var(--font-sans)',
                cursor: 'pointer', transition: 'background 110ms',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Plus size={13} color="var(--accent)" />
              </div>
              New Project
            </button>

            <button
              onClick={() => {
                onClose()
                const input = document.createElement('input')
                input.type = 'file'; input.accept = '.bindery'
                input.onchange = async () => {
                  const f = input.files?.[0]; if (!f) return
                  try {
                    const r = await projectService.importProjectFile(f)
                    setCurrentProject(r.project); suppressNextDirtyFlag(); setPages(r.pages)
                    toast.success(`Opened "${r.project.name}"`)
                  } catch { toast.error('Invalid .bindery file') }
                }
                input.click()
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', border: 'none', background: 'transparent',
                color: 'var(--tx-2)', fontSize: 12.5, fontFamily: 'var(--font-sans)',
                cursor: 'pointer', transition: 'background 110ms',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'var(--s4)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FolderOpen size={13} color="var(--tx-3)" />
              </div>
              Open .bindery file
            </button>

            {/* Recents */}
            {recents.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={10} color="var(--tx-4)" />
                  <p style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--tx-4)',
                    textTransform: 'uppercase', letterSpacing: '0.7px',
                  }}>
                    Recent
                  </p>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', paddingBottom: 6 }}>
                  {recents.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleOpen(p)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', transition: 'background 110ms', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: p.id === currentProject?.id ? 'var(--accent-dim)' : 'var(--s3)',
                        border: `1px solid ${p.id === currentProject?.id ? 'var(--accent-border)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <FolderOpen size={12} color={p.id === currentProject?.id ? 'var(--accent)' : 'var(--tx-3)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 500,
                          color: p.id === currentProject?.id ? 'var(--accent)' : 'var(--tx-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </p>
                        <p style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>
                          {p.pageCount} pages · {formatProjectDate(p)}
                        </p>
                      </div>
                      <button
                        onClick={e => handleDelete(p.id, e)}
                        style={{
                          width: 22, height: 22, flexShrink: 0,
                          borderRadius: 6, border: 'none', background: 'transparent',
                          color: 'var(--tx-4)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 110ms, color 110ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-4)' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
})
ProjectDropdown.displayName = 'ProjectDropdown'