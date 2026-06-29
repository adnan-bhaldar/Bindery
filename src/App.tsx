import { memo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { ContextMenuProvider } from '@/components/common/ContextMenu'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { RecoveryDialog } from '@/features/recovery/RecoveryDialog'
import { InstallBanner } from '@/components/common/InstallBanner'

export const App = memo(() => (
  <ErrorBoundary>
    <TooltipProvider>
      <ConfirmProvider>
        <ContextMenuProvider>
          <AppShell />
          <RecoveryDialog />
          <InstallBanner />
        </ContextMenuProvider>
      </ConfirmProvider>
    </TooltipProvider>
  </ErrorBoundary>
))
App.displayName = 'App'
