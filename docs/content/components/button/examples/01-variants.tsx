import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function Variants() {
  return (
    <div className="demo-row">
      <LabButton variant="filled">Filled</LabButton>
      <LabButton variant="tonal">Tonal</LabButton>
      <LabButton variant="elevated">Elevated</LabButton>
      <LabButton variant="outlined">Outlined</LabButton>
      <LabButton variant="text">Text</LabButton>
      <LabButton variant="ghost">Ghost</LabButton>
      <LabButton variant="destructive">Delete</LabButton>
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'Emphasis, from the one main action on a surface (filled) down to quiet chrome (ghost).',
}
