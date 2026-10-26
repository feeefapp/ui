import { useState } from 'react'
import { StableText } from '@feeef.dev/ui/motion'
import { Button } from '@feeef.dev/ui/primitives/button'

const LABELS = ['Publish', 'Publishing…', 'Published']

export default function StableTextExample() {
  const [step, setStep] = useState(0)
  const publish = () => {
    setStep(1)
    setTimeout(() => setStep(2), 1200)
    setTimeout(() => setStep(0), 2800)
  }
  return (
    <div className="demo-row">
      <Button variant="filled" loading={step === 1} disabled={step === 2} onClick={publish}>
        <StableText value={LABELS[step]} options={LABELS} />
      </Button>
      <Button variant="outlined">Preview</Button>
    </div>
  )
}

export const meta = {
  title: 'Width-stable label',
  description:
    'StableText reserves the width of its longest option, so the button and its neighbor never shift while the label changes.',
}
