import { ArrowRight, Download, Plus } from 'lucide-react'
import { LabButton } from '@feeef.dev/ui/primitives/button'

export default function WithIcons() {
  return (
    <div className="demo-row">
      <LabButton variant="filled">
        <Plus size={18} />
        New order
      </LabButton>
      <LabButton variant="elevated">
        <Download size={18} />
        Export CSV
      </LabButton>
      <LabButton variant="text">
        Continue
        <ArrowRight size={18} />
      </LabButton>
    </div>
  )
}

export const meta = {
  title: 'With icons',
  description: 'Put an icon before the label for an object, after it for direction. The gap is built in.',
}
