import { useMemo, useState } from 'react'
import { Archive, Copy, Download, Pencil, Send, Trash2 } from 'lucide-react'
import { ActionsBar, type Action } from '@feeef.dev/ui/actions'
import { Slider } from '@feeef.dev/ui/primitives/slider'

export default function Priority() {
  const [width, setWidth] = useState(520)
  const actions = useMemo<Action[]>(
    () => [
      { id: 'delete', type: 'action', label: 'Delete', icon: <Trash2 />, destructive: true, priority: -1, onAction: () => {} },
      { id: 'archive', type: 'action', label: 'Archive', icon: <Archive />, priority: 0, onAction: () => {} },
      { id: 'duplicate', type: 'action', label: 'Duplicate', icon: <Copy />, priority: 0, onAction: () => {} },
      { id: 'export', type: 'action', label: 'Export', icon: <Download />, priority: 2, onAction: () => {} },
      { id: 'edit', type: 'action', label: 'Edit', icon: <Pencil />, priority: 5, onAction: () => {} },
      { id: 'publish', type: 'action', label: 'Publish', icon: <Send />, variant: 'filled', priority: 10, onAction: () => {} },
    ],
    []
  )
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <span aria-hidden="true">Width: {width}px</span>
        <Slider label="Bar width" min={120} max={560} step={10} value={width} onValueChange={setWidth} />
      </div>
      <div style={{ width, maxWidth: '100%', outline: '1px dashed var(--lab-line)', borderRadius: 12, padding: 4 }}>
        <ActionsBar label="Product actions" actions={actions} />
      </div>
      <p style={{ margin: 0, fontSize: 14 }}>
        Priorities: Delete −1 · Archive 0 · Duplicate 0 · Export 2 · Edit 5 · Publish 10. Delete spills
        first, then Duplicate (the later of the two zeros), then Archive.
      </p>
    </div>
  )
}

export const meta = {
  title: 'Overflow by priority',
  description:
    'Drag the slider. Lower priorities move into “More actions” first; both lists keep source order.',
}
