import { useRef } from 'react'
import { ScrollGradientOverlay } from '@feeef.dev/ui/scroll'
import '../scroll-demo.css'

const EVENTS = [
  'Order placed',
  'Confirmed by phone',
  'Packed',
  'Handed to Yalidine',
  'Arrived at Oran hub',
  'Out for delivery',
  'Customer not reachable',
  'Second attempt scheduled',
  'Delivered',
  'Cash collected',
  'Remittance received',
]

export default function GradientOverlay() {
  const viewport = useRef<HTMLDivElement>(null)
  return (
    // The overlay is an absolute sibling of your own scroller, inside a relative box.
    <div className="scroll-demo-frame" style={{ height: 300 }}>
      <div ref={viewport} className="scroll-demo-viewport" tabIndex={0} aria-label="Delivery history">
        <div className="scroll-demo-list">
          {EVENTS.map((event, i) => (
            <div key={event} className="scroll-demo-row">
              <span>
                <strong>{event}</strong>
                <small>Oct {i + 3}, 10:{String(i * 5).padStart(2, '0')}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <ScrollGradientOverlay viewport={viewport} topHeight={60} bottomHeight={80} />
    </div>
  )
}

export const meta = {
  title: 'Edge washes on your own scroller',
  description:
    'ScrollGradientOverlay paints the dithered top and bottom washes for any scrolling element. Each wash fades in as content passes under its edge.',
}
