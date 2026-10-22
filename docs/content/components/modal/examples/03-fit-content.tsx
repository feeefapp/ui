import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Dock } from '@feeef.dev/ui/dock'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function FitContent() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Dz Sneakers')
  const [draft, setDraft] = useState(name)
  const close = () => setOpen(false)
  return (
    <div className="demo-row">
      <span>{name}</span>
      <Button
        variant="tonal"
        onClick={() => {
          setDraft(name)
          setOpen(true)
        }}
      >
        Rename store
      </Button>
      <Modal
        open={open}
        close={close}
        label="Rename store"
        scrollable
        fitContent
        bottom={
          <Dock label="Rename actions">
            <Button
              variant="filled"
              disabled={!draft.trim()}
              onClick={() => {
                setName(draft.trim())
                close()
              }}
            >
              Save name
            </Button>
          </Dock>
        }
      >
        <TextField
          hint="Store name"
          value={draft}
          onValueChange={setDraft}
          supportingText="Shown on your storefront and order messages."
        />
      </Modal>
    </div>
  )
}

export const meta = {
  title: 'Fit to content',
  description: 'fitContent sizes a scrollable dialog to its content and chrome, so a one-field form gets a short dialog.',
}
