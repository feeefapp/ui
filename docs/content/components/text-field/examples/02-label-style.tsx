import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function LabelStyle() {
  return (
    <div className="demo-column">
      <TextField hint="Store name" labelStyle="outlined" defaultValue="Dar El Beida Shop" />
      <TextField hint="Store name" labelStyle="inside" variant="tonal" defaultValue="Dar El Beida Shop" />
    </div>
  )
}

export const meta = {
  title: 'Label style',
  description: 'outlined rests the floated hint on the border; inside keeps it within the field, which suits tinted surfaces.',
}
