import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Modal, PresentationDock } from '@feeef.dev/ui/presentation'

const SAVED = { wilaya: 'Alger', commune: 'Bab Ezzouar', street: 'Cité 2068 Logements, Bt 12' }

export default function FormDialog() {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState(SAVED)
  const [draft, setDraft] = useState(SAVED)
  const close = () => setOpen(false)
  return (
    <div className="demo-column">
      <Button
        variant="elevated"
        onClick={() => {
          setDraft(address)
          setOpen(true)
        }}
      >
        <MapPin size={18} /> {address.commune}, {address.wilaya}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        label="Edit delivery address"
        title="Edit delivery address"
        dock={
          <PresentationDock>
            <Button variant="text" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setAddress(draft)
                close()
              }}
            >
              Save address
            </Button>
          </PresentationDock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <TextField hint="Wilaya" value={draft.wilaya} onValueChange={(wilaya) => setDraft({ ...draft, wilaya })} />
          <TextField hint="Commune" value={draft.commune} onValueChange={(commune) => setDraft({ ...draft, commune })} />
          <TextField
            hint="Street and building"
            value={draft.street}
            onValueChange={(street) => setDraft({ ...draft, street })}
          />
        </div>
      </Modal>
    </div>
  )
}

export const meta = {
  title: 'Form dialog',
  description:
    'Modal for a short form: the card hugs the fields, the title and close float in glass at the top and the actions float in a dock, so they never scroll away.',
}
