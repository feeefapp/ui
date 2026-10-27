import { useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Sheet } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Device } from '../../../../src/blocks/device'
import { DemoMap } from '../demo-map'

const STOPS = Array.from({ length: 14 }, (_, i) => ({
  title: `Stop ${i + 1} · ${['Bab Ezzouar', 'Hussein Dey', 'Kouba', 'El Biar', 'Hydra', 'Bir Mourad Raïs', 'Cheraga'][i % 7]}`,
  subtitle: `${2 + (i % 5)} orders · ${(i + 1) * 7} min`,
}))

export default function FreeSheet() {
  const [count, setCount] = useState<'3' | '6' | '14'>('3')
  const stops = STOPS.slice(0, Number(count))
  return (
    <Device label="A phone with a map and a free-moving sheet">
      {(screen) => (
        <>
          <DemoMap />
          <Sheet
            open
            onOpenChange={() => {}}
            label="Route"
            container={screen}
            detents={['peek', 'fit']}
            snap={false}
            modal={false}
            dismissible={false}
            header={
              <div className="demo-maps-header" data-lab-sheet-handle="">
                <TextField variant="tonal" placeholder="Search stops" aria-label="Search stops" leadingIcon={<Search size={18} />} />
              </div>
            }
          >
            <div style={{ paddingInline: 8, paddingBlockEnd: 8 }}>
              <SegmentedControl
                label="Stops"
                value={count}
                onChange={setCount}
                options={[
                  { value: '3', label: '3 stops' },
                  { value: '6', label: '6 stops' },
                  { value: '14', label: '14 stops' },
                ]}
              />
            </div>
            <ListSection header="Today’s route" footer="Scroll the list: the sheet grows first, then the list scrolls.">
              {stops.map((stop) => (
                <ListRow key={stop.title} leading={<MapPin size={18} />} title={stop.title} subtitle={stop.subtitle} onClick={() => {}} />
              ))}
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'A free sheet that fits its content',
  description:
    'snap={false}, detents={["peek", "fit"]}: it rests wherever you let go, between its search bar and its content’s height. Short content stops the sheet at its end; long content lets it reach full height and then scroll. Over the list a drag or the wheel grows the sheet first and scrolls after, and scrolling back to the top shrinks it, in one gesture.',
}
