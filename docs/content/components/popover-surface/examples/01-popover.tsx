import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { StickyNote } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function PopoverExample() {
  const [note, setNote] = useState('Call before arriving, 2nd floor.')
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="tonal">
          <StickyNote size={18} />
          Delivery note
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <PopoverSurface asChild>
          <Popover.Content
            aria-label="Delivery note"
            sideOffset={8}
            collisionPadding={12}
            style={{ width: 'min(320px, calc(100vw - 24px))', padding: 16, display: 'grid', gap: 16 }}
          >
            <strong>Note for the courier</strong>
            <TextField hint="Note" multiline minLines={2} value={note} onValueChange={setNote} />
            <Popover.Close asChild>
              <Button variant="filled">Done</Button>
            </Popover.Close>
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const meta = {
  title: 'Popover',
  description:
    'Radix Popover handles opening, positioning and focus; the surface paints the panel. You set width and padding.',
}
