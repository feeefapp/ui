import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function Basic() {
  return (
    <div className="demo-column">
      <LabTextField hint="Customer name" autoComplete="name" />
      <LabTextField
        hint="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        supportingText="10 digits, starting with 05, 06 or 07."
      />
      <LabTextField hint="Address" defaultValue="12 rue Didouche Mourad, Alger" />
    </div>
  )
}

export const meta = {
  title: 'Basic',
  description: 'A hint names the field and floats up on focus or when there is a value; supporting text adds format help.',
}
