import { useState, type FormEvent } from 'react'
import { ArrowRight, Pencil } from 'lucide-react'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'
import { LabOption, LabSelect } from '@feeef.dev/ui/primitives/select'
import { LabModal } from '@feeef.dev/ui/primitives/modal'
import { LabDock } from '@feeef.dev/ui/dock'
import '../patterns.css'

const phoneError = (phone: string) =>
  /^0[567]\d{8}$/.test(phone.replace(/\s/g, '')) ? null : 'Enter all 10 digits, starting with 05, 06 or 07.'

type Address = { wilaya: string; commune: string; street: string }

/** One field, one value: edit it where it is. Enter saves, Escape puts it back. */
function PhoneRow() {
  const [phone, setPhone] = useState('0555 12 34 56')
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = (event: FormEvent) => {
    event.preventDefault()
    const problem = phoneError(draft ?? '')
    setError(problem)
    if (problem) return
    setPhone(draft!)
    setDraft(null)
  }
  return (
    <div className="pt-edit-row">
      {draft === null ? (
        <>
          <span>
            <small>Phone</small>
            {phone}
          </span>
          <LabIconButton variant="text" aria-label="Edit phone" onClick={() => setDraft(phone)}>
            <Pencil />
          </LabIconButton>
        </>
      ) : (
        <form className="pt-inline-form" onSubmit={save}>
          <LabTextField
            hint="Phone"
            type="tel"
            autoFocus
            value={draft}
            error={error}
            onValueChange={setDraft}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setDraft(null)
                setError(null)
              }
            }}
          />
          <LabButton variant="text" type="button" onClick={() => { setDraft(null); setError(null) }}>
            Cancel
          </LabButton>
          <LabButton variant="filled" type="submit">
            Save
          </LabButton>
        </form>
      )}
    </div>
  )
}

/** A few related fields that must change together: a dialog with its actions in a dock. */
function AddressRow() {
  const [address, setAddress] = useState<Address>({ wilaya: '16 · Alger', commune: 'Bab Ezzouar', street: 'Cité 2068 Logements, Bt 12' })
  const [draft, setDraft] = useState(address)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <div className="pt-edit-row">
      <span>
        <small>Delivery address</small>
        {address.street}, {address.commune}, {address.wilaya}
      </span>
      <LabButton
        variant="tonal"
        onClick={() => {
          setDraft(address)
          setOpen(true)
        }}
      >
        Change address
      </LabButton>
      <LabModal
        open={open}
        close={close}
        label="Change delivery address"
        scrollable
        fitContent
        bottom={
          <LabDock label="Address actions">
            <div className="pt-dock-row">
              <LabButton variant="text" onClick={close}>
                Cancel
              </LabButton>
              <LabButton
                variant="filled"
                onClick={() => {
                  setAddress(draft)
                  close()
                }}
              >
                Save address
              </LabButton>
            </div>
          </LabDock>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <LabSelect hint="Wilaya" value={draft.wilaya} onValueChange={(wilaya) => setDraft({ ...draft, wilaya: wilaya ?? draft.wilaya })}>
            <LabOption>16 · Alger</LabOption>
            <LabOption>31 · Oran</LabOption>
            <LabOption>25 · Constantine</LabOption>
          </LabSelect>
          <LabTextField hint="Commune" value={draft.commune} onValueChange={(commune) => setDraft({ ...draft, commune })} />
          <LabTextField hint="Street and building" value={draft.street} onValueChange={(street) => setDraft({ ...draft, street })} />
        </div>
      </LabModal>
    </div>
  )
}

export default function QuickEdit() {
  return (
    <div className="pt-edit-card">
      <PhoneRow />
      <AddressRow />
      <div className="pt-edit-row">
        <span>
          <small>Products, prices and delivery</small>3 items · 9 600 DA
        </span>
        {/* Many fields, long work, or something to come back to: a page of its own. */}
        <LabButton variant="text">
          Edit order
          <ArrowRight className="lab-dir-flip" />
        </LabButton>
      </div>
    </div>
  )
}

export const meta = {
  title: 'In place, dialog or page',
  description:
    'The phone edits in place, the address opens a short dialog, and the full order opens its own page. Choose by how many fields change together, not by habit.',
}
