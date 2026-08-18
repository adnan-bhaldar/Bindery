import { memo } from 'react'
import { Upload } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardRow, SegRow } from '../primitives'

const ImportSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Import Behavior" icon={Upload}>
                <CardRow label="Generate thumbnails automatically" desc="Create preview thumbnails when images are imported">
                    <Toggle checked={settings.autoGenerateThumbnails} onChange={v => updateSetting('autoGenerateThumbnails', v)} />
                </CardRow>
                <CardRow label="Detect duplicates" desc="Skip images already in the project, based on real content hashing">
                    <Toggle checked={settings.detectDuplicates} onChange={v => updateSetting('detectDuplicates', v)} />
                </CardRow>
                <CardRow label="Choose import type" desc="Ask Images or PDF before opening the file picker, instead of always showing both" last>
                    <Toggle checked={settings.showImportTypeChooser} onChange={v => updateSetting('showImportTypeChooser', v)} />
                </CardRow>
            </Card>
            <Card title="Quality Warnings">
                <CardRow label="Warn on low resolution" desc="Alert when images may look blurry at print size">
                    <Toggle checked={settings.warnLowResolution} onChange={v => updateSetting('warnLowResolution', v)} />
                </CardRow>
                <CardRow label="Low resolution threshold" desc="Effective DPI below which to warn" last>
                    <SegRow
                        value={String(settings.lowResolutionThreshold)}
                        options={[{ value: '72', label: '72 DPI' }, { value: '96', label: '96 DPI' }, { value: '150', label: '150 DPI' }]}
                        onChange={v => updateSetting('lowResolutionThreshold', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
ImportSection.displayName = 'ImportSection'

export default ImportSection
