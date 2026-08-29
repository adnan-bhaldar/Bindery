import { memo } from 'react'
import { Settings } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardRow, SegRow } from '../primitives'

const GeneralSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Session" icon={Settings}>
                <CardRow id="setting-restore-session" label="Restore previous session" desc="Automatically reopen your last project on startup." last>
                    <Toggle checked={settings.restorePreviousSession} onChange={v => updateSetting('restorePreviousSession', v)} />
                </CardRow>
            </Card>
            <Card title="Auto Save" desc="Applies immediately — no restart needed.">
                <CardRow id="setting-autosave-interval" label="Auto save interval" desc="How often to automatically save your project.">
                    <SegRow
                        value={String(settings.autoSaveInterval)}
                        options={[{ value: '0', label: 'Instant' }, { value: '10', label: '10s' }, { value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '1m' }, { value: '300', label: '5m' }]}
                        onChange={v => updateSetting('autoSaveInterval', Number(v))}
                    />
                </CardRow>
                <CardRow id="setting-recovery-snapshots" label="Recovery snapshots" desc="Number of recovery snapshots to keep per project." last>
                    <SegRow
                        value={String(settings.maxRecoverySnapshots)}
                        options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }]}
                        onChange={v => updateSetting('maxRecoverySnapshots', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
GeneralSection.displayName = 'GeneralSection'

export default GeneralSection
