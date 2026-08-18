import { memo } from 'react'
import { Keyboard } from 'lucide-react'
import { Card } from '../primitives'

const ShortcutsSection = memo(() => {
    const shortcuts = [
        { action: 'New Project', keys: ['N'] },
        { action: 'Import Images', keys: ['⌘', 'O'] },
        { action: 'Save Project', keys: ['⌘', 'S'] },
        { action: 'Save As', keys: ['⌘', '⇧', 'S'] },
        { action: 'Export PDF', keys: ['⌘', 'E'] },
        { action: 'Undo', keys: ['⌘', 'Z'] },
        { action: 'Redo', keys: ['⌘', '⇧', 'Z'] },
        { action: 'Select All', keys: ['⌘', 'A'] },
        { action: 'Duplicate', keys: ['⌘', 'D'] },
        { action: 'Delete', keys: ['⌫'] },
        { action: 'Command Palette', keys: ['⌘', 'K'] },
        { action: 'Zoom In', keys: ['⌘', '+'] },
        { action: 'Zoom Out', keys: ['⌘', '−'] },
        { action: 'Reset Zoom', keys: ['⌘', '0'] },
        { action: 'Quick Preview', keys: ['Space'] },
        { action: 'Fullscreen', keys: ['F'] },
        { action: 'Navigate Pages', keys: ['← →'] },
    ]
    return (
        <Card title="Keyboard Shortcuts" icon={Keyboard}>
            {shortcuts.map(({ action, keys }, i) => (
                <div key={action} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i === shortcuts.length - 1 ? 'none' : '1px solid var(--border-soft)',
                }}>
                    <span style={{ fontSize: 12.5, color: 'var(--tx-1)' }}>{action}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
                    </div>
                </div>
            ))}
        </Card>
    )
})
ShortcutsSection.displayName = 'ShortcutsSection'

export default ShortcutsSection
