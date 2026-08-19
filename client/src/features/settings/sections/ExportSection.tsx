import { memo } from 'react'
import { Download, FilePen, UserPen } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardRow } from '../primitives'

const ExportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Export Defaults" icon={Download}>
                <CardRow
                    label="Default filename"
                    desc="Used as a prefix (combined with the current date/time) only when a project has no name of its own — a named project always exports as its own name"
                    last
                >
                    <input
                        value={settings.defaultFilename}
                        onChange={e => updateSetting('defaultFilename', e.target.value)}
                        placeholder="Bindery"
                        style={{
                            padding: '6px 10px', borderRadius: 8,
                            background: 'var(--s3)', border: '1px solid var(--border)',
                            color: 'var(--tx-1)', fontSize: 12, fontFamily: 'var(--font-sans)',
                            outline: 'none', width: 180,
                            transition: 'border-color 110ms, box-shadow 110ms',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                </CardRow>
            </Card>

            <Card title="Document Title" desc="Controls the sidebar Info tab's Title field." icon={FilePen}>
                <CardRow
                    label="Allow custom document title"
                    desc="When off, the exported PDF's title always matches the project name — the sidebar's Title field stays locked to it"
                    last
                >
                    <Toggle
                        checked={settings.allowCustomDocumentTitle}
                        onChange={v => updateSetting('allowCustomDocumentTitle', v)}
                    />
                </CardRow>
            </Card>

            <Card title="Document Author" icon={UserPen} >
                <CardRow
                    label="Default author name"
                    desc="When off, leaving the Author field blank keeps it genuinely empty in the exported PDF instead of filling in a default name"
                    last
                >
                    <Toggle
                        checked={settings.useDefaultAuthorName}
                        onChange={v => updateSetting('useDefaultAuthorName', v)}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
ExportSection.displayName = 'ExportSection'

export default ExportSection
