import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Variants() {
  return (
    <div className="demo-column">
      <TextField variant="outlined" hint="Outlined" defaultValue="Oran" />
      <TextField variant="filled" labelStyle="inside" hint="Filled" defaultValue="Oran" />
      <TextField variant="tonal" labelStyle="inside" hint="Tonal" defaultValue="Oran" />
      <TextField variant="elevated" hint="Elevated" defaultValue="Oran" />
      <TextField variant="text" hint="Text" defaultValue="Oran" />
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'The same emphasis scale as buttons. Pick one per form; outlined is the default.',
}
