import { useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useFloatingBoundary } from '@feeef.dev/ui/menu'
import { Button } from '@feeef.dev/ui/primitives/button'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { ScrollArea } from '@feeef.dev/ui/scroll'

const wilayas = [
  '09 Blida', '13 Tlemcen', '15 Tizi Ouzou', '16 Alger',
  '19 Sétif', '23 Annaba', '25 Constantine', '31 Oran',
]

export default function SearchableDropdown() {
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr')
  const trigger = useRef<HTMLButtonElement>(null)
  const boundary = useFloatingBoundary()
  const term = query.trim().toLowerCase()
  const matches = wilayas.filter((name) => name.toLowerCase().includes(term))

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open && trigger.current) {
          setQuery('')
          setDir(getComputedStyle(trigger.current).direction === 'rtl' ? 'rtl' : 'ltr')
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button ref={trigger} variant="outlined">
          {selected ? `Wilaya · ${selected}` : 'Choose a wilaya'} <ChevronDown aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal container={boundary}>
        <PopoverSurface asChild>
          <Popover.Content
            aria-label="Choose a wilaya"
            dir={dir}
            sideOffset={8}
            collisionPadding={12}
            collisionBoundary={boundary ?? undefined}
            style={{
              width: 'min(320px, var(--radix-popover-content-available-width))',
              height: 'min(320px, var(--radix-popover-content-available-height))',
            }}
          >
            <ScrollArea
              label="Wilaya results"
              viewportProps={{ tabIndex: -1 }}
              top={
                <TextField
                  hint="Search by name or code"
                  leadingIcon={<Search aria-hidden="true" />}
                  value={query}
                  onValueChange={setQuery}
                />
              }
            >
              {matches.length ? (
                <div role="group" aria-label="Matching wilayas" style={{ display: 'grid' }}>
                  {matches.map((name) => (
                    <Popover.Close asChild key={name}>
                      <Button
                        variant="text"
                        aria-pressed={name === selected}
                        style={{ justifyContent: 'start' }}
                        onClick={() => setSelected(name)}
                      >
                        {name}
                        {name === selected && <Check size={18} aria-hidden="true" />}
                      </Button>
                    </Popover.Close>
                  ))}
                </div>
              ) : (
                <p role="status">No matching wilayas</p>
              )}
            </ScrollArea>
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const meta = {
  title: 'Searchable dropdown',
  description: 'Search by wilaya name or code, then choose a match. Reopening shows the full list with the current choice marked.',
}
