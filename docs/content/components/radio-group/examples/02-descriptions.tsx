import { RadioGroup } from '@feeef.dev/ui/primitives/choice'

export default function Descriptions() {
  return (
    <div className="demo-column">
      <RadioGroup
        label="Delivery type"
        description="Prices are shown at checkout for the customer’s wilaya."
        name="delivery"
        defaultValue="home"
        options={[
          { value: 'home', label: 'Home delivery', description: 'The courier brings the parcel to the door. 600 DZD.' },
          { value: 'desk', label: 'Stop desk', description: 'Pickup at the courier’s office. 400 DZD.' },
          { value: 'store', label: 'Store pickup', description: 'Collected from your shop. Free.', disabled: true },
        ]}
      />
    </div>
  )
}

export const meta = {
  title: 'Descriptions and a disabled option',
  description: 'Each option can carry a line of detail; the group description sits under the legend. One option is disabled.',
}
