import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function Sizes() {
  return (
    <div className="demo-row">
      <LabButton variant="filled">Regular</LabButton>
      <LabButton variant="filled" controlSize="compact">
        Compact
      </LabButton>
      <LabButton variant="text" controlSize="inline">
        Inline
      </LabButton>
    </div>
  )
}

export const meta = {
  title: 'Sizes',
  description:
    'Regular is 44px, compact 40px. Inline sits in a line of text. On touch screens every size keeps a 44px target.',
}
