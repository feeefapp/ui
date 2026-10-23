import { Button } from '@feeef.dev/ui/primitives/button'

export default function Sizes() {
  return (
    <div className="demo-row">
      <Button variant="filled" controlSize="small">
        Small
      </Button>
      <Button variant="filled">Regular</Button>
      <Button variant="filled" controlSize="large">
        Large
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
    'The iOS sizes: small 30px, regular 36px, large 52px, all capsules. Inline sits in a line of text. On touch screens every size keeps a 44px target.',
}
