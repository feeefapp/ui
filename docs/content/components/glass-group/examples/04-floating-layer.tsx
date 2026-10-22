import { useEffect, useState } from 'react'
import { FloatingLayer, GlassGroup, ScaffoldProvider } from '@feeef.dev/ui/scaffold'
import { Button } from '@feeef.dev/ui/primitives/button'
import '../glass-demo.css'

/** Reads the reservation the provider writes on <html>. */
function useReserve(name: string) {
  const [value, setValue] = useState('0px')
  useEffect(() => {
    const root = document.documentElement
    const read = () => setValue(root.style.getPropertyValue(name) || '0px')
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['style'] })
    read()
    return () => observer.disconnect()
  }, [name])
  return value
}

function SyncNotice() {
  const [open, setOpen] = useState(false)
  const reserve = useReserve('--lab-notice-reserve')
  return (
    <div className="demo-column">
      <Button variant="tonal" onClick={() => setOpen(!open)}>
        {open ? 'Hide notice' : 'Show sync notice'}
      </Button>
      <p className="glass-demo-status" role="status">
        Reserved at the bottom of the window: {reserve}
      </p>
      {open && (
        <FloatingLayer slot="notice">
          <GlassGroup role="status" className="glass-demo-notice">
            12 orders synced from Yalidine
            <Button variant="text" controlSize="compact" onClick={() => setOpen(false)}>
              Dismiss
            </Button>
          </GlassGroup>
        </FloatingLayer>
      )}
    </div>
  )
}

export default function FloatingLayerExample() {
  // Mount the provider once at the root of your page; it is local here only for the demo.
  return (
    <ScaffoldProvider className="glass-demo-provider">
      <SyncNotice />
    </ScaffoldProvider>
  )
}

export const meta = {
  title: 'Floating layer',
  description:
    'FloatingLayer portals a surface into a viewport-fixed layer and reserves its measured height. Show the notice: it floats at the bottom of the window and the reservation updates.',
}
