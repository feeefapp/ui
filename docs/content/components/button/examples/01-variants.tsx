import { Button } from '@feeef.dev/ui/primitives/button'

export default function Variants() {
  return (
    <div className="demo-row">
      <Button variant="filled">Filled</Button>
      <Button variant="tonal">Tonal</Button>
      <Button variant="elevated">Elevated</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="text">Text</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  )
}

export const meta = {
  title: 'Variants',
  description: 'Emphasis, from the one main action on a surface (filled) down to quiet chrome (ghost).',
}
