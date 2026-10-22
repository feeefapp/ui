import { useEffect, useState } from 'react'
import { Link2, Plus, RotateCw } from 'lucide-react'
import { PixelLoader } from '@feeef.dev/ui/pixel-art'
import { Button } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import '../patterns.css'

type State = 'loading' | 'empty' | 'error' | 'ready'

/** Loading: one calm loader that says what is loading. No spinner per row, no skeleton flicker. */
function OrdersLoading() {
  return (
    <div className="pt-state">
      <PixelLoader size={32} label="Loading orders" />
      <p>Loading orders…</p>
    </div>
  )
}

/** Empty: what this place is for and the first step, never just “No data”. */
function OrdersEmpty() {
  return (
    <div className="pt-state">
      <h4>No orders yet</h4>
      <p>Orders from your store, Instagram and Facebook land here. Share your store link to get the first one.</p>
      <div className="pt-state-actions">
        <Button variant="tonal">
          <Link2 />
          Copy store link
        </Button>
        <Button variant="text">
          <Plus />
          Add an order by hand
        </Button>
      </div>
    </div>
  )
}

/** Error: what failed, that nothing was lost, and a way forward. */
function OrdersError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="pt-state" role="alert">
      <h4>Orders didn’t load</h4>
      <p>The connection dropped before we got your orders. Nothing was lost; try again.</p>
      <Button variant="tonal" onClick={onRetry}>
        <RotateCw />
        Try again
      </Button>
    </div>
  )
}

export default function States() {
  const [state, setState] = useState<State>('error')
  const [attempt, setAttempt] = useState(0)

  // Retrying shows the loader for a moment, then the orders.
  useEffect(() => {
    if (state !== 'loading' || attempt === 0) return
    const timer = setTimeout(() => setState('ready'), 1200)
    return () => clearTimeout(timer)
  }, [state, attempt])

  return (
    <div className="pt-preview">
      <SegmentedControl<State>
        label="Preview state"
        value={state}
        onChange={(next) => {
          setAttempt(0)
          setState(next)
        }}
        options={[
          { value: 'loading', label: 'Loading' },
          { value: 'empty', label: 'Empty' },
          { value: 'error', label: 'Error' },
          { value: 'ready', label: 'Loaded' },
        ]}
      />
      <div className="pt-frame" style={{ height: 340 }} aria-live="polite">
        {state === 'loading' && <OrdersLoading />}
        {state === 'empty' && <OrdersEmpty />}
        {state === 'error' && (
          <OrdersError
            onRetry={() => {
              setAttempt(attempt + 1)
              setState('loading')
            }}
          />
        )}
        {state === 'ready' && (
          <div className="pt-list" style={{ padding: 16 }}>
            {['#1048 · Amina Benali', '#1047 · Yacine Haddad', '#1046 · Sara Meziane'].map((row) => (
              <div key={row} className="pt-row">
                <strong>{row}</strong>
                <span className="pt-tag">New</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const meta = {
  title: 'Loading, empty and error',
  description:
    'Each state says what is happening and offers the next step. Press “Try again” on the error to watch it load. (The segmented control only switches the preview.)',
}
