import { Printer, Truck } from 'lucide-react'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import '../dock-demo.css'

export default function Basic() {
  return (
    <div className="dock-demo-host">
      <LabDock
        label="Order actions"
        content={
          <>
            <strong>Order #1048</strong>
            <small>Confirmed · 4 500 DA</small>
          </>
        }
      >
        <div className="demo-row">
          <LabButton variant="text">
            <Printer />
            Print label
          </LabButton>
          <LabButton variant="filled">
            <Truck />
            Ship order
          </LabButton>
        </div>
      </LabDock>
    </div>
  )
}

export const meta = {
  title: 'Status and actions',
  description:
    'content is a compact title/status tile at the start; children are the actions. The dock hugs both and stays centered in its host.',
}
