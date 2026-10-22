import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Multiline() {
  return (
    <div className="demo-column">
      <TextField
        hint="Delivery note"
        multiline
        minLines={3}
        maxLines={6}
        maxLength={280}
        showCounter
        supportingText="Printed on the shipping label."
      />
    </div>
  )
}

export const meta = {
  title: 'Multiline with a counter',
  description: 'The textarea grows from minLines to maxLines, then scrolls. showCounter counts against maxLength.',
}
