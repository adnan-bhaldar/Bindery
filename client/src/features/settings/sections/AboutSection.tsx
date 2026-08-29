import { memo } from 'react'
import { Image as ImageIcon, ExternalLink } from 'lucide-react'
import { APP_VERSION } from '@/constants'
import { Card, GithubMark } from '../primitives'

const AboutSection = memo(() => (
    <div>
        <Card id="setting-about">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'var(--gradient-accent)',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                }}>
                    <img
                        src="/icons/favicon.svg"
                        alt="logo"
                        draggable={false}
                        onContextMenu={e => e.preventDefault()}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.4px' }}>
                        Bindery
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>
                        Version {APP_VERSION} · Professional Image to PDF
                    </p>
                </div>
            </div>
        </Card>

        <Card id="setting-developer" title="Developer" icon={GithubMark}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--s3)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 5,
                }}>
                    <GithubMark size={25} color="var(--tx-1)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)' }}>Adnan Bhaldar</p>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 1 }}>@adnan-bhaldar</p>
                </div>
                <a
                    href="https://github.com/adnan-bhaldar"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 9,
                        background: 'var(--s3)', border: '1px solid var(--border)',
                        color: 'var(--tx-1)', fontSize: 12, fontWeight: 500,
                        fontFamily: 'var(--font-sans)', textDecoration: 'none',
                        transition: 'background 110ms, border-color 110ms',
                        flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.borderColor = 'var(--border-hard)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                    Profile
                    <ExternalLink size={12} />
                </a>
            </div>
            <a
                href="https://github.com/adnan-bhaldar/Bindery"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid var(--border-soft)',
                    textDecoration: 'none', color: 'var(--tx-3)',
                    fontSize: 12, transition: 'color 110ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx-3)' }}
            >
                <span>View source on GitHub</span>
                <ExternalLink size={12} />
            </a>
        </Card>

        <Card id="setting-built-with" title="Built With" icon={ImageIcon}>
            {[
                { label: 'Framework', value: 'React 19 + TypeScript' },
                { label: 'PDF Engine', value: 'pdf-lib' },
                { label: 'OCR Engine', value: 'Tesseract.js' },
                { label: 'Storage', value: 'IndexedDB via Dexie' },
                { label: 'Build', value: 'Vite' },
            ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft)',
                }}>
                    <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>{value}</span>
                </div>
            ))}
        </Card>
    </div>
))
AboutSection.displayName = 'AboutSection'

export default AboutSection