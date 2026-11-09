import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from '../src/provider'
import { Panel, PanelHost, usePanelStack, type PanelEntry } from '../src/containers/panel-host'

let mounts = 0
function Draft({ id }: { id: string }) {
  const [value, setValue] = React.useState('')
  const stack = usePanelStack()
  React.useEffect(() => { mounts++; return () => { mounts-- } }, [])
  return <><input aria-label={`${id} draft`} value={value} onChange={event => setValue(event.target.value)} />
    <button onClick={() => { void stack.push(entry(`${id}-child`), id) }}>Open child</button>
    {Array.from({ length: 60 }, (_, i) => <p key={i}>{id} content {i}</p>)}
  </>
}
function entry(id: string): PanelEntry {
  return { id, minWidth: 280, preferredWidth: 400, maxWidth: 600,
    panel: <Panel label={id} title={id} trailing={<button>Edit {id}</button>}><Draft id={id} /></Panel> }
}
function Fixture() {
  const [panels, setPanels] = React.useState<readonly PanelEntry[]>([entry('root'), entry('detail'), entry('deep')])
  const [width, setWidth] = React.useState(1100)
  const [guard, setGuard] = React.useState<'allow' | 'deny' | 'reject'>('allow')
  React.useEffect(() => {
    Object.assign(window, { panelFixture: {
      resize: setWidth, guard: setGuard, reset: () => setPanels([entry('root'), entry('detail'), entry('deep')]),
      inspect: () => ({ mounts, ids: panels.map(p => p.id) }),
    } })
  }, [panels])
  return <Provider initialTheme="light" theme={{ motion: 'none' }}>
    <div style={{ width, height: 600 }}><PanelHost panels={panels} onPanelsChange={setPanels}
      beforeClose={async () => { await new Promise(resolve => setTimeout(resolve, 20)); if (guard === 'reject') throw new Error('Guard rejected'); return guard === 'allow' }}
      onCloseError={error => { document.body.dataset.guardError = String(error) }} /></div>
  </Provider>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
