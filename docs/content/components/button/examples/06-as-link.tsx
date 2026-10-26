import { ExternalLink } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function AsLink() {
  return (
    <div className="demo-row">
      <Button variant="filled" asChild>
        <a href="#as-link">Open dashboard</a>
      </Button>
      <Button variant="text" asChild>
        <a href="https://feeef.org" target="_blank" rel="noreferrer">
          feeef.org
          <ExternalLink size={16} />
        </a>
      </Button>
    </div>
  )
}

export const meta = {
  title: 'As a link',
  description:
    'asChild renders your <a> (or router Link) with button styling. Navigation stays a link; disabled and loading still block it.',
}
