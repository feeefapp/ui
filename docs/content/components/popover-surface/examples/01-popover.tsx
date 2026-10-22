import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { StickyNote } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabPopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function PopoverExample() {
  const [note, setNote] = useState('Call before arriving, 2nd floor.')
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <LabButton variant="tonal">
          <StickyNote size={18} />
          Delivery note
        </LabButton>
      </Popover.Trigger>
      <Popover.Portal>
        <LabPopoverSurface asChild>
          <Popover.Content
            aria-label="Delivery note"
            sideOffset={8}
            collisionPadding={12}
            style={{ width: 'min(320px, calc(100vw - 24px))', padding: 16, display: 'grid', gap: 16 }}
          >
            <strong>Note for the courier</strong>
            <LabTextField hint="Note" multiline minLines={2} value={note} onValueChange={setNote} />
            <Popover.Close asChild>
              <LabButton variant="filled">Done</LabButton>
            </Popover.Close>
          </Popover.Content>
        </LabPopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const meta = {
  title: 'Popover',
  description:
    'Radix Popover handles opening, positioning and focus; the surface paints the panel. You set width and padding.',
}
