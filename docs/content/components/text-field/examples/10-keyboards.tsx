import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function Keyboards() {
  return (
    <div className="demo-column">
      <TextField hint="Phone" type="tel" inputMode="tel" autoComplete="tel" leading="+213" />
      <TextField
        hint="Postal code"
        inputMode="numeric"
        pattern="[0-9]{5}"
        maxLength={5}
        supportingText="Five digits, like 16000."
      />
      <TextField hint="Customer name" autoCapitalize="words" autoComplete="name" />
    </div>
  )
}

export const meta = {
  title: 'Keyboards and input rules',
  description:
    'Native attributes pass through to the input: inputMode picks the keyboard, pattern checks the value, autoCapitalize shapes the text. Flutter uses keyboardType, inputFormatters and textCapitalization.',
}
