import { useEffect, useState } from 'react'
import { LabFloatingLayer, LabGlassGroup, LabScaffoldProvider } from '@feeef.dev/ui/scaffold'
import { LabButton } from '@feeef.dev/ui/primitives/button'
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
      <LabButton variant="tonal" onClick={() => setOpen(!open)}>
        {open ? 'Hide notice' : 'Show sync notice'}
      </LabButton>
      <p className="glass-demo-status" role="status">
        Reserved at the bottom of the window: {reserve}
      </p>
      {open && (
        <LabFloatingLayer slot="notice">
          <LabGlassGroup role="status" className="glass-demo-notice">
            12 orders synced from Yalidine
            <LabButton variant="text" controlSize="compact" onClick={() => setOpen(false)}>
              Dismiss
            </LabButton>
          </LabGlassGroup>
        </LabFloatingLayer>
      )}
    </div>
  )
}

export default function FloatingLayer() {
  // Mount the provider once at the root of your page; it is local here only for the demo.
  return (
    <LabScaffoldProvider className="glass-demo-provider">
      <SyncNotice />
    </LabScaffoldProvider>
  )
}

export const meta = {
  title: 'Floating layer',
  description:
    'LabFloatingLayer portals a surface into a viewport-fixed layer and reserves its measured height. Show the notice: it floats at the bottom of the window and the reservation updates.',
}
