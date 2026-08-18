import { memo } from 'react'
import { Shield } from 'lucide-react'
import { Card } from '../primitives'

const PrivacySection = memo(() => (
    <Card title="Privacy First" icon={Shield}>
        <p style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7 }}>
            Bindery processes all images entirely on your device. No images, files, or project data
            are ever uploaded to any server. OCR runs via Tesseract.js in a browser worker.
            PDF generation uses pdf-lib entirely in your browser. There is no analytics or
            tracking of any kind built into the app — not a toggle to turn off, there's simply
            nothing here that phones home.
        </p>
    </Card>
))
PrivacySection.displayName = 'PrivacySection'

export default PrivacySection
