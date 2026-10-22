import { useState } from 'react'
import { RawInput } from '@feeef.dev/ui/primitives/raw-input'

export default function RawInputExample() {
  const [title, setTitle] = useState('Summer collection 2026')
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="demo-wide">
      <RawInput
        aria-label="Collection title"
        multiline
        maxLines={3}
        value={title}
        onValueChange={setTitle}
        validationMode="change"
        validator={(value) => (value.trim() ? null : 'Give the collection a title.')}
        onValidationChange={setError}
        aria-invalid={Boolean(error)}
        aria-describedby="collection-title-error"
        style={{
          width: '100%',
          border: 0,
          padding: 0,
          background: 'transparent',
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: 28,
          fontWeight: 600,
          lineHeight: '36px',
        }}
      />
      <p id="collection-title-error" role="status">
        {error}
      </p>
    </div>
  )
}

export const meta = {
  title: 'Bespoke editor',
  description: 'RawInput is the unpainted editor inside the field: same validation and growing lines, your own surface.',
}
