import { useMemo } from 'react'
import { Copy, Pencil, Share2, Trash2 } from 'lucide-react'
import { LabActionsBar, LabActionsWidthProvider, type LabAction } from '@feeef.dev/ui/actions'

export default function WidthProvider() {
  const actions = useMemo<LabAction[]>(
    () => [
      { id: 'delete', type: 'action', label: 'Delete', icon: <Trash2 />, destructive: true, priority: -1, onAction: () => {} },
      { id: 'copy', type: 'action', label: 'Copy link', icon: <Copy />, onAction: () => {} },
      { id: 'share', type: 'action', label: 'Share', icon: <Share2 />, priority: 1, onAction: () => {} },
      { id: 'edit', type: 'action', label: 'Edit', icon: <Pencil />, variant: 'tonal', priority: 5, onAction: () => {} },
    ],
    []
  )
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid var(--lab-line)', borderRadius: 16 }}>
      <strong>Summer sale page</strong>
      <LabActionsWidthProvider value={220}>
        <LabActionsBar label="Page actions" actions={actions} size="compact" />
      </LabActionsWidthProvider>
    </div>
  )
}

export const meta = {
  title: 'Width from a shrink-wrapping parent',
  description:
    'Inside an inline-sized container, pass the space available with LabActionsWidthProvider. The bar then sizes itself to what fits.',
}
