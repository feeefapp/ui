import { Button } from '@feeef.dev/ui/primitives/button'

export default function Sizes() {
  return (
    <div className="demo-row">
      <Button variant="filled">Regular</Button>
      <Button variant="filled" controlSize="compact">
        Compact
      </Button>
      <Button variant="text" controlSize="inline">
        Inline
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Sizes',
  description:
    'Regular is 44px, compact 40px. Inline sits in a line of text. On touch screens every size keeps a 44px target.',
}
