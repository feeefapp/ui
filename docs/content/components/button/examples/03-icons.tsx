import { ArrowRight, Download, Plus } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function WithIcons() {
  return (
    <div className="demo-row">
      <Button variant="filled">
        <Plus size={18} />
        New order
      </Button>
      <Button variant="elevated">
        <Download size={18} />
        Export CSV
      </Button>
      <Button variant="text">
        Continue
        <ArrowRight size={18} />
      </Button>
    </div>
  )
}

export const meta = {
  title: 'With icons',
  description: 'Put an icon before the label for an object, after it for direction. The gap is built in.',
}
