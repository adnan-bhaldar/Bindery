import { memo } from 'react'
import { Accessibility } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardRow } from '../primitives'

const AccessibilitySection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="Visual" icon={Accessibility} desc="Takes effect immediately across the whole app.">
                <CardRow label="High contrast" desc="Stronger borders and text contrast for better legibility">
                    <Toggle checked={settings.highContrast} onChange={v => updateSetting('highContrast', v)} />
                </CardRow>
                <CardRow label="Always show focus ring" desc="Keep keyboard focus indicator visible at all times">
                    <Toggle checked={settings.focusRingAlwaysVisible} onChange={v => updateSetting('focusRingAlwaysVisible', v)} />
                </CardRow>
                <CardRow label="Large text" desc="Scale up the whole interface for easier reading" last>
                    <Toggle checked={settings.largeText} onChange={v => updateSetting('largeText', v)} />
                </CardRow>
            </Card>
        </div>
    )
})
AccessibilitySection.displayName = 'AccessibilitySection'

export default AccessibilitySection
