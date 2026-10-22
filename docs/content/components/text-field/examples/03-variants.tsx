import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export default function Variants() {
  return (
    <div className="demo-column">
      <LabTextField variant="outlined" hint="Outlined" defaultValue="Oran" />
      <LabTextField variant="filled" labelStyle="inside" hint="Filled" defaultValue="Oran" />
      <LabTextField variant="tonal" labelStyle="inside" hint="Tonal" defaultValue="Oran" />
      <LabTextField variant="elevated" hint="Elevated" defaultValue="Oran" />
      <LabTextField variant="text" hint="Text" defaultValue="Oran" />
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'The same emphasis scale as buttons. Pick one per form; outlined is the default.',
}
