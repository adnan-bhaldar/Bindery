import { memo, useEffect, useRef, useState } from 'react'
import { Upload, ImagePlus, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useUIStore } from '@/stores/uiStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { PreviewWorkspace } from '@/features/preview/PreviewWorkspace'
import { ACCEPTED_IMAGE_TYPES } from '@/constants'
import { PHASE_LABELS } from '@/features/import/ImportProgress'
import type { ImportProgress } from '@/services/importService'

interface Props {
  onImport: () => void
  isImporting: boolean
  onDrop: (files: File[]) => void
  importProgress: ImportProgress | null
}

export const Workspace = memo(({ onImport, isImporting, onDrop, importProgress }: Props) => {
  const pageCount = usePagesStore(selectPageCount)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    noClick: true,
    noKeyboard: true,
    disabled: isImporting,
  })

  // isDragActive itself can flicker true/false/true within milliseconds —
  // the overlay below mounts/unmounts as it toggles, and those DOM changes
  // under the cursor trigger extra native dragenter/dragleave events of
  // their own. Debounce the false transition only, so a brief flicker
  // collapses into one steady overlay instead of visibly stuttering; the
  // true transition stays instant so showing the overlay never feels
  // delayed.
  const [showOverlay, setShowOverlay] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDragActive) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
      hideTimeout.current = null
      setShowOverlay(true)
    } else {
      hideTimeout.current = setTimeout(() => setShowOverlay(false), 120)
    }
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
    }
  }, [isDragActive])

  return (
    <main className="workspace" {...getRootProps()}>
      <input {...getInputProps()} />

      <AnimatePresence>
        {showOverlay && <DropOverlay />}
      </AnimatePresence>

      {pageCount === 0 && isImporting
        ? <ImportingState progress={importProgress} />
        : pageCount === 0
          ? <EmptyState onImport={onImport} />
          : <PreviewWorkspace />
      }
    </main>
  )
})
Workspace.displayName = 'Workspace'

/* ── Drop overlay ─────────────────────────────────────────────── */
const DropOverlay = memo(() => (
  <motion.div
    className="drop-overlay"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    <motion.div
      className="drop-overlay-card"
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.94, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="drop-overlay-icon">
        <Upload size={32} color="var(--accent)" strokeWidth={1.5} />
      </div>
      <p className="drop-overlay-title">Release to import</p>
      <p className="drop-overlay-sub">All images will be added to your project</p>
    </motion.div>
  </motion.div>
))
DropOverlay.displayName = 'DropOverlay'

/* ── Importing state (new project only) ──────────────────────── */
const ImportingState = memo(({ progress }: { progress: ImportProgress | null }) => {
  const isDone = progress?.phase === 'done'
  const pct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="ws-empty">
      <div className="ws-orb ws-orb-1" />
      <div className="ws-orb ws-orb-2" />

      <div className="ws-card anim-scale-in">
        <div className="ws-card-shimmer" />

        <div className="ws-card-icon-ring anim-slide-up">
          <div className="ws-card-icon-inner">
            {isDone
              ? <CheckCircle2 size={22} color="#fff" strokeWidth={2} />
              : <Loader2 size={22} color="#fff" strokeWidth={2}
                  style={{ animation: 'spin 0.8s linear infinite' }} />
            }
          </div>
        </div>

        <div className="anim-slide-up delay-75" style={{ textAlign: 'center', marginBottom: 24, width: '100%' }}>
          <h2 className="ws-card-title">
            {progress ? PHASE_LABELS[progress.phase] : 'Importing…'}
          </h2>
          <p className="ws-card-sub" style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 300, margin: '0 auto',
          }}>
            {progress?.currentFile || 'Setting up your project'}
          </p>
        </div>

        {progress && progress.total > 0 && (
          <div className="anim-slide-up delay-150" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
                {progress.current}/{progress.total}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--s4)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: 'var(--gradient-accent)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
ImportingState.displayName = 'ImportingState'

/* ── Empty state ──────────────────────────────────────────────── */
const EmptyState = memo(({ onImport }: { onImport: () => void }) => {
  const { openCommandPalette } = useUIStore()

  return (
    <div className="ws-empty">
      <div className="ws-orb ws-orb-1" />
      <div className="ws-orb ws-orb-2" />

      <div className="ws-card anim-scale-in">
        <div className="ws-card-shimmer" />

        <div className="ws-card-icon-ring anim-slide-up">
          <div className="ws-card-icon-inner">
            <ImagePlus size={22} color="#fff" strokeWidth={2} />
          </div>
        </div>

        <div className="anim-slide-up delay-75"
          style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 className="ws-card-title">Drop images to get started</h2>
          <p className="ws-card-sub">
            Supports JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC
          </p>
        </div>

        <div className="anim-slide-up delay-150"
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="ws-import-btn" onClick={onImport}>
            <Upload size={15} strokeWidth={2.5} />
            Import Images
          </button>
          <div className="ws-or-divider">
            <span className="ws-or-line" />
            or drag &amp; drop anywhere
            <span className="ws-or-line" />
          </div>
        </div>

        <div className="ws-hints anim-slide-up delay-225"
          style={{ width: '100%', marginTop: 16 }}>
          {[
            { key: '⌘K', label: 'Open command palette', fn: openCommandPalette },
            { key: '⌘O', label: 'Import images', fn: onImport },
            { key: '⌘E', label: 'Export PDF', fn: undefined },
          ].map(({ key, label, fn }) => (
            <button key={key} className="ws-hint-row" onClick={fn}>
              <kbd className="kbd">{key}</kbd>
              <span className="ws-hint-label">{label}</span>
              <ArrowRight size={12} color="var(--tx-4)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})
EmptyState.displayName = 'EmptyState'