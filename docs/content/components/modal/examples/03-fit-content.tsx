import { useState } from 'react'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function FitContent() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Dz Sneakers')
  const [draft, setDraft] = useState(name)
  const close = () => setOpen(false)
  return (
    <div className="demo-row">
      <span>{name}</span>
      <LabButton
        variant="tonal"
        onClick={() => {
          setDraft(name)
          setOpen(true)
        }}
      >
        Rename store
      </LabButton>
      <LabModal
        open={open}
        close={close}
        label="Rename store"
        scrollable
        fitContent
        bottom={
          <LabDock label="Rename actions">
            <LabButton
              variant="filled"
              disabled={!draft.trim()}
              onClick={() => {
                setName(draft.trim())
                close()
              }}
            >
              Save name
            </LabButton>
          </LabDock>
        }
      >
        <LabTextField
          hint="Store name"
          value={draft}
          onValueChange={setDraft}
          supportingText="Shown on your storefront and order messages."
        />
      </LabModal>
    </div>
  )
}

export const meta = {
  title: 'Fit to content',
  description: 'fitContent sizes a scrollable dialog to its content and chrome, so a one-field form gets a short dialog.',
}
