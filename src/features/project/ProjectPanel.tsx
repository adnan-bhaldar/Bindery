import { useShallow } from 'zustand/react/shallow'
import { memo, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FolderOpen, Plus, Clock, Trash2,
    FileText, Save, Download,
} from 'lucide-react'
import { suppressNextDirtyFlag } from '@/stores/storeLinks'
import { useProjectStore } from '@/stores/projectStore'
import { usePagesStore } from '@/stores/pagesStore'
import { projectService, formatProjectDate } from '@/services/projectService'
import { Tooltip } from '@/components/ui/Tooltip'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import type { Project } from '@/types'

// ─── Recent project card ──────────────────────────────────────────────────────

const RecentCard = memo(({
    project,
    onOpen,
    onDelete,
}: {
    project: Project
    onOpen: (p: Project) => void
    onDelete: (id: string) => void
}) => {
    const [hovered, setHovered] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 'var(--r-md)',
                background: hovered ? 'var(--hover)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 110ms',
            }}
            onClick={() => onOpen(project)}
        >
            {/* Icon */}
            <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'var(--s4)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <FileText size={14} color="var(--tx-3)" strokeWidth={1.5} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--tx-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {project.name}
                </p>
                <p style={{ fontSize: 10.5, color: 'var(--tx-3)', marginTop: 1 }}>
                    {project.pageCount} page{project.pageCount !== 1 ? 's' : ''} · {formatProjectDate(project)}
                </p>
            </div>

            {/* Delete */}
            {hovered && (
                <Tooltip content="Remove from recents" placement="left">
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(project.id) }}
                        style={{
                            width: 24, height: 24, borderRadius: 6,
                            border: 'none', background: 'transparent',
                            color: 'var(--tx-3)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 110ms, color 110ms',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' }}
                    >
                        <Trash2 size={11} />
                    </button>
                </Tooltip>
            )}
        </motion.div>
    )
})
RecentCard.displayName = 'RecentCard'

// ─── ProjectPanel ─────────────────────────────────────────────────────────────

export const ProjectPanel = memo(() => {
    const { currentProject, setCurrentProject, recentProjects, setRecentProjects, removeRecentProject } = useProjectStore()
    const pageCount = usePagesStore(s => s.pages.length)
    const { setPages, clearPages } = usePagesStore(
        useShallow(s => ({ setPages: s.setPages, clearPages: s.clearPages }))
    )
    const [saving, setSaving] = useState(false)
    const confirm = useConfirm()

    // Load recent projects on mount
    useEffect(() => {
        projectService.getRecentProjects().then(setRecentProjects)
    }, [setRecentProjects])

    const handleNew = useCallback(async () => {
        const project = await projectService.createProject()
        suppressNextDirtyFlag()
        clearPages()
        setCurrentProject(project)
        toast.success('New project created')
    }, [clearPages, setCurrentProject])

    const handleSave = useCallback(async () => {
        if (!currentProject) {
            toast.error('No project to save')
            return
        }
        setSaving(true)
        try {
            await projectService.saveProject(useProjectStore.getState().currentProject!, usePagesStore.getState().pages)
            setCurrentProject({ ...currentProject, status: 'saved' })
            toast.success('Project saved')
        } catch {
            toast.error('Failed to save project')
        } finally {
            setSaving(false)
        }
    }, [currentProject, setCurrentProject])

    const handleOpen = useCallback(async (project: Project) => {
        try {
            const result = await projectService.loadProject(project.id)
            if (!result) { toast.error('Project not found'); return }
            setCurrentProject(result.project)
            suppressNextDirtyFlag(); setPages(result.pages)
            toast.success(`Opened "${result.project.name}"`)
        } catch {
            toast.error('Failed to open project')
        }
    }, [setCurrentProject, setPages])

    const handleDelete = useCallback(async (id: string) => {
        const project = recentProjects.find(p => p.id === id)
        const ok = await confirm({
            title: 'Delete project?',
            message: `"${project?.name ?? 'This project'}" will be permanently deleted from your library. This cannot be undone.`,
            confirmLabel: 'Delete Project',
            cancelLabel: 'Keep it',
            variant: 'danger',
        })
        if (!ok) return
        try {
            await projectService.deleteProject(id)
            removeRecentProject(id)
            toast.success('Project deleted')
        } catch {
            toast.error('Failed to delete project')
        }
    }, [removeRecentProject, recentProjects, confirm])

    const handleExportFile = useCallback(async () => {
        if (!currentProject) return
        try {
            const blob = await projectService.exportProjectFile(useProjectStore.getState().currentProject!, usePagesStore.getState().pages)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${currentProject.name}.bindery`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Project exported as .bindery file')
        } catch {
            toast.error('Export failed')
        }
    }, [currentProject])

    const handleImportFile = useCallback(() => {
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
                toast.success(`Imported "${result.project.name}"`)
            } catch {
                toast.error('Invalid .bindery file')
            }
        }
        input.click()
    }, [setCurrentProject, setPages])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Current project info */}
            {currentProject ? (
                <div style={{ padding: '14px 14px 0' }}>
                    <div style={{
                        padding: 12, borderRadius: 'var(--r-lg)',
                        background: 'var(--s3)', border: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FileText size={16} color="var(--accent)" strokeWidth={1.5} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontSize: 12.5, fontWeight: 600, color: 'var(--tx-1)',
                                    letterSpacing: '-0.2px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {currentProject.name}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 2 }}>
                                    {pageCount} page{pageCount !== 1 ? 's' : ''} · {
                                        currentProject.status === 'saved' ? 'Saved' :
                                            currentProject.status === 'modified' ? 'Unsaved changes' : 'New project'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 5 }}>
                            <Tooltip content="Save project" shortcut="⌘S" placement="top">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{ ...projectBtnStyle, flex: 1 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                                >
                                    <Save size={12} />
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            </Tooltip>
                            <Tooltip content="Export .bindery file" placement="top">
                                <button
                                    onClick={handleExportFile}
                                    style={{ ...projectBtnStyle, flex: 1 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                                >
                                    <Download size={12} />
                                    Export
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '14px 14px 0' }}>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.5, marginBottom: 10 }}>
                        No project open. Create a new project or open a .bindery file.
                    </p>
                </div>
            )}

            {/* New / Open buttons */}
            <div style={{ padding: '12px 14px 0', display: 'flex', gap: 6 }}>
                <button
                    onClick={handleNew}
                    style={{ ...projectBtnStyle, flex: 1, color: 'var(--accent)', borderColor: 'var(--accent-border)', background: 'var(--accent-dim)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)' }}
                >
                    <Plus size={12} />
                    New Project
                </button>
                <Tooltip content="Open .bindery file" placement="top">
                    <button
                        onClick={handleImportFile}
                        style={{ ...projectBtnStyle, flex: 1 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--s5)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--s4)' }}
                    >
                        <FolderOpen size={12} />
                        Open
                    </button>
                </Tooltip>
            </div>

            {/* Recents */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 16 }}>
                <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={11} color="var(--tx-4)" />
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-4)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                        Recent Projects
                    </p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 16px' }}>
                    <AnimatePresence>
                        {recentProjects.length === 0 ? (
                            <p style={{ fontSize: 11.5, color: 'var(--tx-4)', padding: '8px 10px' }}>
                                No recent projects
                            </p>
                        ) : (
                            recentProjects.map(p => (
                                <RecentCard
                                    key={p.id}
                                    project={p}
                                    onOpen={handleOpen}
                                    onDelete={handleDelete}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
})
ProjectPanel.displayName = 'ProjectPanel'

const projectBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '6px 10px', borderRadius: 'var(--r-md)',
    border: '1px solid var(--border)', background: 'var(--s4)',
    color: 'var(--tx-2)', fontSize: 11.5, fontWeight: 500,
    fontFamily: 'var(--font-sans)', cursor: 'pointer',
    transition: 'background 110ms',
}
