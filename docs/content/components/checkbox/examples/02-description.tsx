import { LabCheckbox } from '@feeef.dev/ui/primitives/choice'

export default function Description() {
  return (
    <fieldset className="demo-column" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ marginBottom: 12, fontWeight: 600 }}>Order notifications</legend>
      <LabCheckbox
        name="notify"
        value="sms"
        defaultChecked
        label="SMS to the customer"
        description="One SMS credit per order. You have 412 left."
      />
      <LabCheckbox
        name="notify"
        value="whatsapp"
        label="WhatsApp message"
        description="Needs a connected WhatsApp Business number."
      />
      <LabCheckbox name="notify" value="email" label="Email to the store owner" description="Sent to owner@dzshop.dz." />
    </fieldset>
  )
}

export const meta = {
  title: 'With descriptions',
  description: 'description adds a line of detail under the label. A fieldset and legend name the group.',
}
