import { memo } from 'react'
import { ScanText, Languages, Rocket } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Toggle } from '@/components/ui/Toggle'
import { OCR_LANGUAGE_LABELS } from '@/constants'
import type { AppSettings } from '@/types'
import { Card, CardRow, SegRow, SelectRow } from '../primitives'

const OCRSection = memo(() => {
    const { settings, updateSetting } = useSettingsStore()
    return (
        <div>
            <Card title="OCR Engine" icon={ScanText}>
                <CardRow id="setting-enable-ocr" label="Enable OCR" desc="Extract text from images to create searchable PDFs">
                    <Toggle checked={settings.ocrEnabled} onChange={v => updateSetting('ocrEnabled', v)} />
                </CardRow>
                <CardRow id="setting-ocr-auto" label="Run OCR automatically" desc="Process OCR when images are imported" last>
                    <Toggle checked={settings.autoRunOcr} onChange={v => updateSetting('autoRunOcr', v)} />
                </CardRow>
            </Card>
            <Card title="Language" icon={Languages}>
                <CardRow id="setting-ocr-language" label="OCR language" desc="Primary language for text recognition" last>
                    <SelectRow
                        value={settings.ocrLanguage}
                        options={Object.entries(OCR_LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
                        onChange={v => updateSetting('ocrLanguage', v as AppSettings['ocrLanguage'])}
                    />
                </CardRow>
            </Card>
            <Card title="Performance" icon={Rocket}>
                <CardRow id="setting-ocr-skip-large" label="Skip OCR for large documents" desc="Avoid processing documents over the page limit">
                    <Toggle checked={settings.skipOcrForLargeDocuments} onChange={v => updateSetting('skipOcrForLargeDocuments', v)} />
                </CardRow>
                <CardRow id="setting-ocr-page-limit" label="Page limit" desc="Maximum pages to process with OCR" last>
                    <SegRow
                        value={String(settings.ocrPageLimit)}
                        options={[{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '500', label: '500' }]}
                        onChange={v => updateSetting('ocrPageLimit', Number(v))}
                    />
                </CardRow>
            </Card>
        </div>
    )
})
OCRSection.displayName = 'OCRSection'

export default OCRSection
