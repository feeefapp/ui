import { useRef, useState } from 'react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Option, Select } from '@feeef.dev/ui/primitives/select'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'
import '../patterns.css'

type Settings = {
  name: string
  phone: string
  wilaya: string
  homeFee: number
  deskFee: number
  freeOver: boolean
  attempts: number
}

const SAVED: Settings = {
  name: 'Atlas Store',
  phone: '0555 12 34 56',
  wilaya: '16',
  homeFee: 600,
  deskFee: 400,
  freeOver: false,
  attempts: 3,
}

/** Algerian mobile numbers: 10 digits starting with 05, 06 or 07. */
const phoneError = (phone: string) =>
  /^0[567]\d{8}$/.test(phone.replace(/\s/g, '')) ? null : 'Enter all 10 digits, starting with 05, 06 or 07.'

const FEATURES = [
  { id: 'queue', label: 'Queue new orders for a call', description: 'New orders go straight to your agents’ call queue.' },
  { id: 'reviews', label: 'Product reviews', description: 'Ask delivered customers to rate what they bought.' },
]

/** Switches apply on their own, right away: they never wait for the Save button. */
function FeatureSwitches() {
  const [on, setOn] = useState<Record<string, boolean>>({ queue: true, reviews: false })
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <section className="pt-section" aria-labelledby="settings-features">
      <h4 id="settings-features">Features</h4>
      <p>These apply as soon as you switch them.</p>
      {FEATURES.map((feature) => (
        <div key={feature.id} className="pt-switch-row">
          <span aria-hidden="true">
            <strong>{feature.label}</strong>
            <small>{feature.description}</small>
          </span>
          <SlideSwitch
            label={feature.label}
            checked={on[feature.id]}
            loading={busy === feature.id}
            onCheckedCommit={(checked) => {
              setOn((current) => ({ ...current, [feature.id]: checked }))
              setBusy(feature.id)
              setTimeout(() => setBusy(null), 600)
            }}
          />
        </div>
      ))}
    </section>
  )
}

export default function StoreSettings() {
  const [saved, setSaved] = useState(SAVED)
  const [draft, setDraft] = useState(SAVED)
  const [errors, setErrors] = useState<{ phone?: string | null }>({})
  const [saving, setSaving] = useState(false)
  const phoneRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const save = () => {
    const phone = phoneError(draft.phone)
    setErrors({ phone })
    if (phone) {
      // After the error renders, so the field is announced with its message.
      requestAnimationFrame(() => phoneRef.current?.focus())
      return
    }
    setSaving(true)
    setTimeout(() => {
      setSaved(draft)
      setSaving(false)
    }, 700)
  }

  return (
    <div className="pt-frame">
      <ScrollArea
        label="Store settings"
        bottom={
          <Dock
            label="Settings actions"
            swapKey={dirty ? 'dirty' : 'clean'}
            content={<span className="pt-status">{dirty ? 'Unsaved' : 'Saved'}</span>}
          >
            <div className="pt-dock-row">
              {dirty && (
                <Button
                  variant="text"
                  onClick={() => {
                    setDraft(saved)
                    setErrors({})
                  }}
                >
                  Discard
                </Button>
              )}
              <Button variant="filled" disabled={!dirty || saving} onClick={save}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Dock>
        }
      >
        <form
          className="pt-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <section className="pt-section" aria-labelledby="settings-store">
            <h4 id="settings-store">Store</h4>
            <p>Shown to customers on your store and on shipping labels.</p>
            <div className="pt-fields">
              <TextField hint="Store name" value={draft.name} onValueChange={(value) => set('name', value)} required />
              <TextField
                ref={phoneRef}
                hint="Support phone"
                type="tel"
                inputMode="tel"
                value={draft.phone}
                error={errors.phone}
                onValueChange={(value) => {
                  set('phone', value)
                  if (errors.phone) setErrors({ phone: phoneError(value) })
                }}
                onBlur={() => setErrors({ phone: phoneError(draft.phone) })}
              />
              <Select hint="Ship from" value={draft.wilaya} onValueChange={(value) => set('wilaya', value ?? '16')}>
                <Option value="16">16 · Alger</Option>
                <Option value="31">31 · Oran</Option>
                <Option value="25">25 · Constantine</Option>
                <Option value="09">09 · Blida</Option>
              </Select>
            </div>
          </section>

          <section className="pt-section" aria-labelledby="settings-delivery">
            <h4 id="settings-delivery">Delivery</h4>
            <p>What customers pay at checkout. Couriers bill you separately.</p>
            <div className="pt-fields">
              <NumberField label="Home delivery" unit="DA" step={50} min={0} max={2000} value={draft.homeFee} onValueChange={(value) => set('homeFee', value)} />
              <NumberField label="Stop desk" unit="DA" step={50} min={0} max={2000} value={draft.deskFee} onValueChange={(value) => set('deskFee', value)} />
            </div>
            <Checkbox
              label="Free delivery over 10 000 DA"
              description="Orders above this total ship free to every wilaya."
              checked={draft.freeOver}
              onCheckedChange={(on) => set('freeOver', on)}
            />
          </section>

          <section className="pt-section" aria-labelledby="settings-calls">
            <h4 id="settings-calls">Confirmation calls</h4>
            <div className="pt-fields">
              <NumberField
                label="Call attempts before failing"
                min={1}
                max={6}
                value={draft.attempts}
                onValueChange={(value) => set('attempts', value)}
              />
            </div>
          </section>
        </form>
        <FeatureSwitches />
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Store settings',
  description:
    'Form sections on surfaces with one Save in the dock that wakes up only when something changed; on/off choices that wait for Save are checkboxes. Switches below the form apply on their own. Clear a digit from the phone and save: the error appears at the field, which takes focus.',
}
