import { useState } from 'react'
import { LabStableText } from '@feeef.dev/ui/motion'
import { LabButton } from '@feeef.dev/ui/primitives/button'

const LABELS = ['Publish', 'Publishing…', 'Published']

export default function StableText() {
  const [step, setStep] = useState(0)
  const publish = () => {
    setStep(1)
    setTimeout(() => setStep(2), 1200)
    setTimeout(() => setStep(0), 2800)
  }
  return (
    <div className="demo-row">
      <LabButton variant="filled" loading={step === 1} disabled={step === 2} onClick={publish}>
        <LabStableText value={LABELS[step]} options={LABELS} />
      </LabButton>
      <LabButton variant="outlined">Preview</LabButton>
    </div>
  )
}

export const meta = {
  title: 'Width-stable label',
  description:
    'LabStableText reserves the width of its longest option, so the button and its neighbor never shift while the label changes.',
}
