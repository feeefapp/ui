import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabPopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabTemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'
import { validateTemporal, type LabTemporalValue } from '@feeef.dev/ui/filters/temporal'

const config = { type: 'dateRange' } as const

function describe(value: LabTemporalValue) {
  if (!value || typeof value === 'string') return 'All time'
  return `${value.from || '…'} → ${value.to || '…'}`
}

export default function InAPopover() {
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState<LabTemporalValue>(null)
  const [draft, setDraft] = useState<LabTemporalValue>(null)
  const [error, setError] = useState<string | null>(null)
  const apply = () => {
    const failure = validateTemporal(config, draft)
    if (failure) return setError(failure)
    setApplied(draft)
    setOpen(false)
  }
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(applied)
          setError(null)
        }
        setOpen(next)
      }}
    >
      <Popover.Trigger asChild>
        <LabButton variant="outlined">
          <CalendarDays size={18} />
          Placed: {describe(applied)}
        </LabButton>
      </Popover.Trigger>
      <Popover.Portal>
        <LabPopoverSurface asChild>
          <Popover.Content
            aria-label="Filter orders by date"
            sideOffset={8}
            collisionPadding={12}
            style={{ width: 'min(640px, calc(100vw - 24px))', height: 'min(520px, 70vh)' }}
          >
            <LabScrollArea
              label="Date filter"
              contentPadding={12}
              bottom={
                <LabDock label="Date filter actions">
                  <LabButton variant="text" controlSize="compact" onClick={() => setDraft(null)}>
                    Clear
                  </LabButton>
                  <LabButton variant="filled" controlSize="compact" onClick={apply}>
                    Apply
                  </LabButton>
                </LabDock>
              }
            >
              <LabTemporalFilterEditor config={config} value={draft} onChange={setDraft} />
              {error && <p role="alert">{error}</p>}
            </LabScrollArea>
          </Popover.Content>
        </LabPopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const meta = {
  title: 'Filter chip with a popover',
  description:
    'Edit a draft, validate it, then apply. The popover owns the trigger; the editor only picks values.',
}
