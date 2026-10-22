import { useState } from 'react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

const TAKEN = ['dzshop', 'feeef', 'store']

export default function ServerError() {
  const [slug, setSlug] = useState('dzshop')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const check = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setError(TAKEN.includes(slug) ? `${slug}.feeef.store is taken. Try another name.` : null)
    }, 600)
  }
  return (
    <div className="demo-column">
      <TextField
        hint="Store address"
        value={slug}
        onValueChange={(next) => {
          setSlug(next.toLowerCase())
          setError(null)
        }}
        trailing=".feeef.store"
        error={error}
        supportingText="Letters, numbers and dashes."
      />
      <Button variant="tonal" loading={checking} onClick={check}>
        Check availability
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Errors from the server',
  description: 'Pass error for messages you learn about later, and clear it as soon as the value changes.',
}
