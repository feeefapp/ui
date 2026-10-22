import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { TemporalFilterEditor } from '@feeef.dev/ui/filters/temporal-editor'
import { validateTemporal, type TemporalValue } from '@feeef.dev/ui/filters/temporal'

const config = { type: 'dateRange' } as const

function describe(value: TemporalValue) {
  if (!value || typeof value === 'string') return 'All time'
  return `${value.from || '…'} → ${value.to || '…'}`
}

export default function InAPopover() {
  const [open, setOpen] = useState(false)
  const [applied, setApplied] = useState<TemporalValue>(null)
  const [draft, setDraft] = useState<TemporalValue>(null)
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
        <Button variant="outlined">
          <CalendarDays size={18} />
          Placed: {describe(applied)}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <PopoverSurface asChild>
          <Popover.Content
            aria-label="Filter orders by date"
            sideOffset={8}
            collisionPadding={12}
            style={{ width: 'min(640px, calc(100vw - 24px))', height: 'min(520px, 70vh)' }}
          >
            <ScrollArea
              label="Date filter"
              contentPadding={12}
              bottom={
                <Dock label="Date filter actions">
                  <Button variant="text" controlSize="compact" onClick={() => setDraft(null)}>
                    Clear
                  </Button>
                  <Button variant="filled" controlSize="compact" onClick={apply}>
                    Apply
                  </Button>
                </Dock>
              }
            >
              <TemporalFilterEditor config={config} value={draft} onChange={setDraft} />
              {error && <p role="alert">{error}</p>}
            </ScrollArea>
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const meta = {
  title: 'Filter chip with a popover',
  description:
    'Edit a draft, validate it, then apply. The popover owns the trigger; the editor only picks values.',
}
