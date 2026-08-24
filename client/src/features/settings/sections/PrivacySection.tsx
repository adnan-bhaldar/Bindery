import { memo } from 'react'
import { Shield } from 'lucide-react'
import { Card } from '../primitives'

const PrivacySection = memo(() => (
    <Card title="Privacy First" icon={Shield}>
        <p style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7 }}>
            Bindery processes all images entirely on your device. No images, files, or project data
            are ever uploaded to any server — not now, not with an account, not ever. OCR runs via
            Tesseract.js in a browser worker. PDF generation uses pdf-lib entirely in your browser.
        </p>
        <p style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.7, marginTop: 10 }}>
            An account is entirely optional. If you choose to sign up, the only things that ever
            reach a server are your login credentials and your app settings — and only when you
            explicitly click save or load in the Account section. There's no automatic or
            background sync, and no analytics or tracking of any kind.
        </p>
    </Card>
))
PrivacySection.displayName = 'PrivacySection'

export default PrivacySection
