import { memo, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Download, FileText,
    CheckCircle2, AlertCircle, Loader2, Crown,
} from 'lucide-react'
import { useExportStore, useActivePreset } from '@/stores/exportStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'

import { pdfService } from '@/services/pdfService'
import { Toggle } from '@/components/ui/Toggle'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatFileSize } from '@/lib/utils'
import type { ExportProgress, CompressionQuality } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strips characters that are invalid in filenames across Windows/macOS/Linux
// (\ / : * ? " < > |), trims, and collapses repeated whitespace — so a
// project name typed with odd spacing/punctuation still makes a clean,
// cross-platform-safe download filename.
function sanitizeFilename(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
}

// e.g. "2026-07-12_1430" — sortable, filesystem-safe, no colons (which
// Windows disallows in filenames).
function formatTimestampForFilename(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

const QUALITY_OPTIONS: { value: CompressionQuality; label: string; desc: string }[] = [
    { value: 'original', label: 'Original', desc: 'No compression' },
    { value: 95, label: '95%', desc: 'Near-lossless' },
    { value: 85, label: '85%', desc: 'High quality' },
    { value: 75, label: '75%', desc: 'Good quality' },
    { value: 50, label: '50%', desc: 'Smaller file' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

const SLabel = memo(({ children }: { children: React.ReactNode }) => (
    <p style={{
        fontSize: 10, fontWeight: 700, color: 'var(--tx-4)',
        textTransform: 'uppercase', letterSpacing: '0.8px',
        marginBottom: 8, marginTop: 16,
    }}>
        {children}
    </p>
))
SLabel.displayName = 'SLabel'

// ─── Left panel — summary ─────────────────────────────────────────────────────

const ExportSummary = memo(({ pageCount, estimatedSize, preset }: {
    pageCount: number
    estimatedSize: number
    preset: ReturnType<typeof useActivePreset>
}) => {
    const pages = usePagesStore((s) => s.pages)
    const coverPage = pages.find(p => p.isCover)
    const ocrDone = pages.filter(p => p.ocrStatus === 'done').length

    return (
        <div style={{
            width: 220, flexShrink: 0,
            background: 'var(--bg-panel)',
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            padding: '20px 18px',
            gap: 16,
        }}>
            {/* Cover preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 100, height: 136, borderRadius: 6,
                    background: 'var(--s3)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    boxShadow: 'var(--sh-md)',
                    position: 'relative',
                }}>
                    {coverPage?.thumbnailUrl ? (
                        <img src={coverPage.thumbnailUrl} alt="Cover"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FileText size={28} color="var(--tx-4)" strokeWidth={1.5} />
                        </div>
                    )}
                    {coverPage && (
                        <div style={{
                            position: 'absolute', top: 4, left: 4,
                            width: 18, height: 18, borderRadius: 99,
                            background: 'rgba(0,0,0,0.7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Crown size={9} color="#f59e0b" />
                        </div>
                    )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--tx-3)', textAlign: 'center' }}>
                    Cover preview
                </p>
            </div>

            {/* Stats */}
            <div style={{
                background: 'var(--s3)', borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)', padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
            }}>
                {[
                    { label: 'Pages', value: String(pageCount) },
                    { label: 'Est. size', value: formatFileSize(estimatedSize) },
                    { label: 'Compression', value: preset.compression === 'original' ? 'None' : `${preset.compression}%` },
                    { label: 'OCR text', value: ocrDone > 0 ? `${ocrDone} pages` : 'None' },
                ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-1)', fontFamily: 'var(--font-mono)' }}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
})
ExportSummary.displayName = 'ExportSummary'

// ─── Right panel — settings ───────────────────────────────────────────────────

const ExportSettings = memo(({ filename, onFilenameChange }: {
    filename: string
    onFilenameChange: (v: string) => void
}) => {
    const { presets, activePresetId, setActivePreset, updatePreset } = useExportStore(
        useShallow((s) => ({
            presets: s.presets,
            activePresetId: s.activePresetId,
            setActivePreset: s.setActivePreset,
            updatePreset: s.updatePreset,
        }))
    )
    const preset = useActivePreset()

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
            {/* Filename */}
            <SLabel>Filename</SLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <input
                    value={filename}
                    onChange={e => onFilenameChange(e.target.value)}
                    style={{
                        flex: 1, padding: '8px 12px',
                        background: 'var(--s3)', border: '1px solid var(--border)',
                        borderRadius: '8px 0 0 8px', color: 'var(--tx-1)',
                        fontSize: 12.5, fontFamily: 'var(--font-sans)', outline: 'none',
                        transition: 'border-color 110ms, box-shadow 110ms',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                />
                <div style={{
                    padding: '8px 12px',
                    background: 'var(--s4)', border: '1px solid var(--border)', borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    fontSize: 12, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)',
                }}>
                    .pdf
                </div>
            </div>

            {/* Preset */}
            <SLabel>Quality Preset</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {presets.map(p => (
                    <button key={p.id} onClick={() => setActivePreset(p.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px',
                        background: activePresetId === p.id ? 'var(--accent-dim)' : 'var(--s3)',
                        border: `1px solid ${activePresetId === p.id ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-md)', cursor: 'pointer',
                        transition: 'all 110ms', textAlign: 'left',
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: activePresetId === p.id ? 'var(--accent)' : 'var(--border-hard)',
                            transition: 'background 110ms',
                        }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)' }}>{p.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1 }}>
                                {p.pageSize.toUpperCase()} · {p.compression === 'original' ? 'No compression' : `${p.compression}% quality`}
                            </p>
                        </div>
                        {activePresetId === p.id && <CheckCircle2 size={14} color="var(--accent)" />}
                    </button>
                ))}
            </div>

            {/* Compression */}
            <SLabel>Image Quality</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {QUALITY_OPTIONS.map(q => (
                    <button key={String(q.value)} onClick={() => updatePreset(preset.id, { compression: q.value })} style={{
                        display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: preset.compression === q.value ? 'var(--accent-dim)' : 'transparent',
                        border: `1px solid ${preset.compression === q.value ? 'var(--accent-border)' : 'transparent'}`,
                        borderRadius: 'var(--r-md)', cursor: 'pointer',
                        transition: 'all 110ms',
                    }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)', minWidth: 56 }}>{q.label}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--tx-3)' }}>{q.desc}</span>
                        </div>
                        {preset.compression === q.value && <CheckCircle2 size={13} color="var(--accent)" />}
                    </button>
                ))}
            </div>

            {/* Toggles */}
            <SLabel>Options</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                    { key: 'pageNumbers', label: 'Page numbers', desc: 'Add page numbers to each page' },
                    { key: 'includeOcr', label: 'Include OCR layer', desc: 'Embed searchable text layer' },
                    { key: 'autoOptimize', label: 'Auto optimize', desc: 'Automatically compress large images' },
                ].map(({ key, label, desc }) => (
                    <div key={key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                        padding: '8px 0', borderBottom: '1px solid var(--border-soft)',
                    }}>
                        <div>
                            <p style={{ fontSize: 12.5, color: 'var(--tx-1)' }}>{label}</p>
                            <p style={{ fontSize: 11, color: 'var(--tx-3)', marginTop: 1 }}>{desc}</p>
                        </div>
                        <Toggle
                            checked={preset[key as keyof typeof preset] as boolean}
                            onChange={v => updatePreset(preset.id, { [key]: v })}
                            size="sm"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
})
ExportSettings.displayName = 'ExportSettings'

// ─── Export progress overlay ──────────────────────────────────────────────────

const ExportProgressView = memo(({ progress }: { progress: ExportProgress }) => {
    const stages = ['preparing', 'processing', 'generating', 'done']
    const stageIdx = stages.indexOf(progress.stage)
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

    return (
        <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--bg-overlay)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24, zIndex: 10,
        }}>
            <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: progress.stage === 'done' ? 'rgba(34,197,94,0.12)' : 'var(--accent-dim)',
                border: `1px solid ${progress.stage === 'done' ? 'rgba(34,197,94,0.25)' : 'var(--accent-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {progress.stage === 'done'
                    ? <CheckCircle2 size={28} color="#22c55e" />
                    : progress.stage === 'error'
                        ? <AlertCircle size={28} color="#ef4444" />
                        : <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
                }
            </div>

            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.4px', marginBottom: 6 }}>
                    {progress.stage === 'done' ? 'Export Complete' : progress.message}
                </p>
                {progress.stage !== 'done' && (
                    <p style={{ fontSize: 12, color: 'var(--tx-3)' }}>
                        Page {progress.current} of {progress.total}
                    </p>
                )}
            </div>

            {/* Progress bar */}
            {progress.stage !== 'done' && (
                <div style={{ width: 320 }}>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--s4)', overflow: 'hidden' }}>
                        <motion.div
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 99, background: 'var(--gradient-accent)' }}
                        />
                    </div>
                    {/* Stage dots */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        {['Prepare', 'Process', 'Generate', 'Done'].map((s, i) => (
                            <span key={s} style={{
                                fontSize: 10, color: i <= stageIdx ? 'var(--accent)' : 'var(--tx-4)',
                                fontWeight: i === stageIdx ? 600 : 400,
                                transition: 'color 200ms',
                            }}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
})
ExportProgressView.displayName = 'ExportProgressView'

// ─── ExportDialog ─────────────────────────────────────────────────────────────

export const ExportDialog = memo(() => {
    const { isDialogOpen, closeDialog, filename, setFilename, setProgress, resetProgress, progress } = useExportStore(
        useShallow((s) => ({
            isDialogOpen: s.isDialogOpen,
            closeDialog: s.closeDialog,
            filename: s.filename,
            setFilename: s.setFilename,
            setProgress: s.setProgress,
            resetProgress: s.resetProgress,
            progress: s.progress,
        }))
    )
    const preset = useActivePreset()
    const pages = usePagesStore((s) => s.pages)
    const pageCount = usePagesStore(selectPageCount)
    const { currentProject } = useProjectStore()
    const { settings } = useSettingsStore()

    // Whenever the export dialog is opened, default the filename to the
    // current project's name (sanitized for filesystem safety) — falling
    // back to the configured default prefix (Settings → Export) when no
    // real project name has been set (a fresh/untitled project). This is
    // deliberately just the clean base name — no timestamp baked in here.
    // The date/time only ever gets appended once, at the actual moment of
    // download (see handleExport below), so what you see and edit in this
    // field always stays exactly what you typed.
    useEffect(() => {
        if (!isDialogOpen) return
        const hasRealName = !!currentProject?.name && currentProject.name !== 'Untitled Project'
        const derived = hasRealName ? sanitizeFilename(currentProject!.name) : ''
        setFilename(derived || settings.defaultFilename || 'Bindery')
        // Only re-derive when the dialog transitions open, not on every
        // keystroke the user makes in the filename field afterwards.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDialogOpen])

    const estimatedSize = pdfService.estimateSize(pages, preset.compression)

    const handleExport = useCallback(async () => {
        if (pages.length === 0) return

        resetProgress()

        try {
            const pagesForExport = pages
            const rawMetadata = currentProject?.metadata ?? {
                title: '', author: '', subject: '', keywords: '',
                creator: 'Bindery', producer: 'Bindery PDF Engine', copyright: '',
            }
            // Title priority: when "Allow custom document title" is off,
            // the project's own name always wins outright — this matches
            // the sidebar Info panel's behavior exactly, including
            // discarding any custom title that might still be stored from
            // when the toggle was previously on. Only when the toggle is on
            // does an explicitly-set Title in the sidebar take priority
            // over the project name.
            const hasRealProjectName = !!currentProject?.name && currentProject.name !== 'Untitled Project'
            const metadata = {
                ...rawMetadata,
                title: (!settings.allowCustomDocumentTitle && hasRealProjectName)
                    ? currentProject!.name
                    : (rawMetadata.title?.trim()
                        ? rawMetadata.title
                        : (hasRealProjectName ? currentProject!.name : rawMetadata.title)),
            }

            const bytes = await pdfService.generate(
                pagesForExport,
                {
                    scope: 'all',
                    preset,
                    filename,
                    metadata,
                    useExactAutoPageSize: settings.useExactAutoPageSize,
                    useDefaultAuthorName: settings.useDefaultAuthorName,
                },
                (p) => setProgress(p)
            )

            // The timestamp is appended ONLY here, at the actual moment of
            // download, and ONLY when there's no real project name behind
            // the filename — a named project should still export as exactly
            // its own name, with nothing appended. The visible/editable
            // filename field itself never shows this; it always stays
            // whatever clean text is in it.
            const hasRealName = !!currentProject?.name && currentProject.name !== 'Untitled Project'
            const downloadName = hasRealName ? filename : `${filename}-${formatTimestampForFilename()}`

            // Trigger download
            const blob = new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${downloadName}.pdf`
            a.click()
            URL.revokeObjectURL(url)

            setProgress({ stage: 'done', current: pages.length, total: pages.length, message: 'Done' })

            setTimeout(() => {
                closeDialog()
                resetProgress()
            }, 1800)
        } catch (err) {
            setProgress({
                stage: 'error', current: 0, total: 0,
                message: 'Export failed',
                error: err instanceof Error ? err.message : 'Unknown error',
            })
        }
    }, [pages, preset, filename, currentProject, settings, closeDialog, resetProgress, setProgress])

    const isExporting = progress.stage !== 'idle' && progress.stage !== 'done'

    return (
        <AnimatePresence>
            {isDialogOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => !isExporting && closeDialog()}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 200,
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        }}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -16 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'fixed', inset: 0, margin: 'auto',
                            zIndex: 201,
                            width: '90vw', maxWidth: 860,
                            height: '82vh', maxHeight: 660,
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)',
                            borderRadius: 'var(--r-3xl)',
                            boxShadow: 'var(--sh-dialog)',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '16px 20px', borderBottom: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: 9,
                                background: 'var(--gradient-accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 10px var(--accent-glow)',
                            }}>
                                <Download size={14} color="#fff" strokeWidth={2.5} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.3px' }}>
                                    Export PDF
                                </p>
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)' }}>
                                    {pageCount} page{pageCount !== 1 ? 's' : ''} · {formatFileSize(estimatedSize)} estimated
                                </p>
                            </div>
                            <Tooltip content="Close" shortcut="Esc" placement="bottom">
                                <button className="icon-btn" onClick={closeDialog} disabled={isExporting}>
                                    <X size={15} />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                            <ExportSummary
                                pageCount={pageCount}
                                estimatedSize={estimatedSize}
                                preset={preset}
                            />
                            <ExportSettings
                                filename={filename}
                                onFilenameChange={setFilename}
                            />

                            {/* Export progress overlay */}
                            <AnimatePresence>
                                {(isExporting || progress.stage === 'done') && (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        style={{ position: 'absolute', inset: 0 }}
                                    >
                                        <ExportProgressView progress={progress} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                            padding: '14px 20px', borderTop: '1px solid var(--border)',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={closeDialog}
                                disabled={isExporting}
                                style={{
                                    padding: '8px 18px', borderRadius: 'var(--r-md)',
                                    border: '1px solid var(--border)', background: 'var(--s3)',
                                    color: 'var(--tx-2)', fontSize: 12.5, fontWeight: 500,
                                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                                    transition: 'background 110ms', opacity: isExporting ? 0.5 : 1,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)' }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={isExporting || pageCount === 0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    padding: '8px 20px', borderRadius: 'var(--r-md)',
                                    background: isExporting ? 'var(--s4)' : 'var(--gradient-accent)',
                                    color: '#fff', border: 'none',
                                    fontSize: 12.5, fontWeight: 600,
                                    fontFamily: 'var(--font-sans)', cursor: isExporting ? 'not-allowed' : 'pointer',
                                    boxShadow: isExporting ? 'none' : '0 2px 12px var(--accent-glow)',
                                    transition: 'opacity 110ms, transform 110ms, box-shadow 110ms',
                                    opacity: (isExporting || pageCount === 0) ? 0.6 : 1,
                                }}
                                onMouseEnter={e => { if (!isExporting && pageCount > 0) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
                            >
                                {isExporting
                                    ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Exporting…</>
                                    : <><Download size={13} strokeWidth={2.5} /> Export PDF</>
                                }
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
})
ExportDialog.displayName = 'ExportDialog'