import { memo } from 'react'
import { Upload, ImagePlus, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { useUIStore } from '@/stores/uiStore'
import { usePagesStore, selectPageCount } from '@/stores/pagesStore'
import { PreviewWorkspace } from '@/features/preview/PreviewWorkspace'
import { ACCEPTED_IMAGE_TYPES } from '@/constants'

interface Props {
  onImport: () => void
  isImporting: boolean
  onDrop: (files: File[]) => void
}

export const Workspace = memo(({ onImport, isImporting, onDrop }: Props) => {
  const pageCount = usePagesStore(selectPageCount)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    noClick: true,
    noKeyboard: true,
    disabled: isImporting,
  })

  return (
    <main className="workspace" {...getRootProps()}>
      <input {...getInputProps()} />

      <AnimatePresence>
        {isDragActive && <DropOverlay />}
      </AnimatePresence>

      {pageCount === 0
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