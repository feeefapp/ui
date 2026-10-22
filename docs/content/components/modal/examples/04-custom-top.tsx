import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'

const COURIERS = {
  home: ['Yalidine · 600 DZD · 2 days', 'ZR Express · 650 DZD · 1 day', 'Maystro · 550 DZD · 3 days'],
  desk: ['Yalidine stop desk · 400 DZD', 'ZR Express agency · 450 DZD'],
}

export default function CustomTop() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'home' | 'desk'>('home')
  return (
    <>
      <LabButton variant="outlined" onClick={() => setOpen(true)}>
        Choose courier
      </LabButton>
      <LabModal
        open={open}
        close={() => setOpen(false)}
        label="Choose a courier"
        scrollable
        fitContent
        top={
          <LabToolbarGroup label="Delivery type">
            <LabSegmentedControl
              label="Delivery type"
              appearance="plain"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'home', label: 'Home' },
                { value: 'desk', label: 'Stop desk' },
              ]}
            />
          </LabToolbarGroup>
        }
      >
        <div style={{ display: 'grid', gap: 8 }}>
          {COURIERS[mode].map((courier) => (
            <LabButton key={courier} variant="elevated" onClick={() => setOpen(false)}>
              {courier}
            </LabButton>
          ))}
        </div>
      </LabModal>
    </>
  )
}

export const meta = {
  title: 'Custom header',
  description:
    'top replaces the default title with your own tools. label still names the dialog for screen readers.',
}
