import { memo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { ContextMenuProvider } from '@/components/common/ContextMenu'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { RecoveryDialog } from '@/features/recovery/RecoveryDialog'
import { InstallBanner } from '@/components/common/InstallBanner'
import { UpdateAvailableDialog } from '@/components/common/UpdateAvailableDialog'
import { WhatsNewDialog } from '@/components/common/WhatsNewDialog'
import { StorageWarningDialog } from '@/components/common/StorageWarningDialog'
import { AuthDialog } from '@/components/ui/AuthDialog'
import { CropDialog } from '@/features/crop/CropDialog'

export const App = memo(() => (
  <ErrorBoundary>
    <TooltipProvider>
      <ConfirmProvider>
        <ContextMenuProvider>
          <AppShell />
          <RecoveryDialog />
          <InstallBanner />
          <UpdateAvailableDialog />
          <WhatsNewDialog />
          <StorageWarningDialog />
          <AuthDialog />
          <CropDialog />
        </ContextMenuProvider>
      </ConfirmProvider>
    </TooltipProvider>
  </ErrorBoundary>
))
App.displayName = 'App'