import { ExternalLink } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function AsLink() {
  return (
    <div className="demo-row">
      <LabButton variant="filled" asChild>
        <a href="#as-link">Open dashboard</a>
      </LabButton>
      <LabButton variant="text" asChild>
        <a href="https://feeef.org" target="_blank" rel="noreferrer">
          feeef.org
          <ExternalLink size={16} />
        </a>
      </LabButton>
    </div>
  )
}

export const meta = {
  title: 'As a link',
  description:
    'asChild renders your <a> (or router Link) with button styling. Navigation stays a link; disabled and loading still block it.',
}
