import { Printer, Truck } from 'lucide-react'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import '../dock-demo.css'

export default function Basic() {
  return (
    <div className="dock-demo-host">
      <Dock
        label="Order actions"
        content={
          <>
            <strong>Order #1048</strong>
            <small>Confirmed · 4 500 DA</small>
          </>
        }
      >
        <div className="demo-row">
          <Button variant="text">
            <Printer />
            Print label
          </Button>
          <Button variant="filled">
            <Truck />
            Ship order
          </Button>
        </div>
      </Dock>
    </div>
  )
}

export const meta = {
  title: 'Status and actions',
  description:
    'content is a compact title/status tile at the start; children are the actions. The dock hugs both and stays centered in its host.',
}
