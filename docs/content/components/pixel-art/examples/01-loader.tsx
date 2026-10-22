import { useState } from 'react'
import { PixelLoader } from '@feeef.dev/ui/pixel-art'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function Loader() {
  const [exporting, setExporting] = useState(true)
  return (
    <div className="demo-column">
      <div className="demo-row">
        <PixelLoader label="Loading orders" />
        <PixelLoader size={32} label="Generating audio" />
      </div>
      <div className="demo-row" role="status">
        {exporting ? (
          <>
            <PixelLoader size={16} decorative />
            <span>Exporting 248 orders…</span>
          </>
        ) : (
          <span>Export ready.</span>
        )}
      </div>
      <Button variant="outlined" controlSize="compact" onClick={() => setExporting(!exporting)}>
        {exporting ? 'Finish export' : 'Start again'}
      </Button>
    </div>
  )
}

export const meta = {
  title: 'Loader',
  description:
    'A standalone loader is a status with its own label. Next to text that already says what is happening, mark it decorative.',
}
