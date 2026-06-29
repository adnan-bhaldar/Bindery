import { memo, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ACCEPTED_IMAGE_TYPES } from '@/constants'

interface Props {
    onFiles: (files: File[]) => void
    isImporting: boolean
    children: React.ReactNode
}

export const ImportZone = memo(({ onFiles, isImporting, children }: Props) => {
    const onDrop = useCallback((accepted: File[]) => {
        if (accepted.length > 0) onFiles(accepted)
    }, [onFiles])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_IMAGE_TYPES,
        noClick: true, // Don't open picker on click — we have explicit buttons
        noKeyboard: true,
        disabled: isImporting,
    })

    return (
        <div {...getRootProps()} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <input {...getInputProps()} />
            {children}

            {/* Drop overlay */}
            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 60,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                                padding: '48px 56px',
                                background: 'var(--bg-overlay)',
                                border: '2px dashed var(--accent)',
                                borderRadius: 24,
                                boxShadow: 'var(--sh-xl), 0 0 60px var(--accent-glow)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                width: 72, height: 72, borderRadius: 22,
                                background: 'var(--accent-dim)',
                                border: '1px solid var(--accent-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 32px var(--accent-glow)',
                                animation: 'float 2s ease-in-out infinite',
                            }}>
                                <Upload size={32} color="var(--accent)" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
                                    Release to import
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--tx-3)' }}>
                                    All images will be added to your project
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})
ImportZone.displayName = 'ImportZone'
