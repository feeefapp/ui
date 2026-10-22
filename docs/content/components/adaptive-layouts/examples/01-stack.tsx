import { useState } from 'react'
import { AdaptiveStack } from '@feeef.dev/ui/containers'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import '../adaptive-demo.css'

export default function StatsStack() {
  const [width, setWidth] = useState(640)
  return (
    <div className="ad-demo">
      <Slider label="Width" min={260} max={720} value={width} onValueChange={setWidth} />
      <div className="ad-frame" style={{ width }}>
        <AdaptiveStack align="stretch">
          <div className="ad-stat">
            <span>To confirm</span>
            <strong>24</strong>
          </div>
          <div className="ad-stat">
            <span>Shipped today</span>
            <strong>61</strong>
          </div>
          <div className="ad-stat">
            <span>Cash to collect</span>
            <strong>184 500 DA</strong>
          </div>
        </AdaptiveStack>
      </div>
    </div>
  )
}

export const meta = {
  title: 'Row or column',
  description:
    'Drag the width. While the three stats fit side by side they stay in a row; when they would not, they become a column, each flying to its new place.',
}
