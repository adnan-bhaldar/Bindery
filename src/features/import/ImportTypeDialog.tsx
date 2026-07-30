import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, FileText, X } from 'lucide-react'

interface Props {
    open: boolean
    onChooseImages: () => void
    onChoosePdf: () => void
    onClose: () => void
}

const OPTIONS = [
    {
        id: 'images',
        icon: ImageIcon,
        label: 'Images',
        desc: 'JPG, PNG, HEIC, and more',
        badges: ['JPG', 'PNG', 'HEIC'],
    },
    {
        id: 'pdf',
        icon: FileText,
        label: 'PDF',
        desc: 'Each page becomes an editable page',
        badges: ['PDF'],
    },
] as const

export const ImportTypeDialog = memo(({ open, onChooseImages, onChoosePdf, onClose }: Props) => {
    const [hovered, setHovered] = useState<string | null>(null)

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 500,
                        background: 'radial-gradient(circle at 50% 40%, rgba(124,109,242,0.08), rgba(0,0,0,0.6) 70%)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 14 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.94, opacity: 0, y: 8, transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: 420, background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-hard)', borderRadius: 22,
                            padding: 22,
                            boxShadow: 'var(--sh-xl), 0 0 60px rgba(124,109,242,0.12)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* ambient glow inside the card */}
                        <div style={{
                            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
                            width: 280, height: 160, borderRadius: '50%',
                            background: 'var(--gradient-accent)', opacity: 0.12, filter: 'blur(50px)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div>
                                <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
                                    What are you importing?
                                </p>
                                <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 3 }}>
                                    Choose a type to open the right file picker
                                </p>
                            </div>
                            <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ flexShrink: 0 }}>
                                <X size={14} />
                            </button>
                        </div>

                        <div style={{ position: 'relative', display: 'flex', gap: 12 }}>
                            {OPTIONS.map((opt, i) => {
                                const Icon = opt.icon
                                const isHovered = hovered === opt.id
                                return (
                                    <motion.button
                                        key={opt.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 + i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                        onClick={opt.id === 'images' ? onChooseImages : onChoosePdf}
                                        onMouseEnter={() => setHovered(opt.id)}
                                        onMouseLeave={() => setHovered(null)}
                                        style={{
                                            flex: 1, position: 'relative',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                                            padding: '22px 14px',
                                            borderRadius: 16,
                                            background: isHovered ? 'var(--s4)' : 'var(--s3)',
                                            border: `1px solid ${isHovered ? 'var(--accent-border)' : 'var(--border)'}`,
                                            color: 'var(--tx-1)', cursor: 'pointer',
                                            transform: isHovered ? 'translateY(-3px)' : 'none',
                                            boxShadow: isHovered ? '0 10px 28px rgba(124,109,242,0.16)' : 'none',
                                            transition: 'background 160ms, border-color 160ms, transform 160ms, box-shadow 160ms',
                                        }}
                                    >
                                        <div style={{ position: 'relative', width: 46, height: 46 }}>
                                            <div style={{
                                                width: 46, height: 46, borderRadius: 13,
                                                background: 'var(--gradient-accent)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: isHovered ? '0 6px 18px var(--accent-glow)' : '0 2px 8px var(--accent-glow)',
                                                animation: isHovered ? 'pulseRing 1.6s ease-in-out infinite' : 'none',
                                                transition: 'box-shadow 160ms',
                                            }}>
                                                <Icon size={21} color="#fff" strokeWidth={2} />
                                            </div>
                                        </div>

                                        <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.1px' }}>{opt.label}</span>
                                        <span style={{ fontSize: 10.5, color: 'var(--tx-3)', textAlign: 'center', lineHeight: 1.4, minHeight: 28 }}>
                                            {opt.desc}
                                        </span>

                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {opt.badges.map(b => (
                                                <span key={b} style={{
                                                    fontSize: 9, fontWeight: 600, letterSpacing: '0.3px',
                                                    padding: '2px 7px', borderRadius: 99,
                                                    background: 'var(--s4)', color: 'var(--tx-3)',
                                                    border: '1px solid var(--border)',
                                                }}>
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
})
ImportTypeDialog.displayName = 'ImportTypeDialog'