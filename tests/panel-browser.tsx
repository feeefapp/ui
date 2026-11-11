import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from '../src/provider'
import { Panel, PanelHost, usePanelStack, type PanelEntry } from '../src/containers/panel-host'
import { SplitView } from '../src/containers/split-view'
import type { PanelWidths } from '../src/containers/panel-model'

let mounts = 0, renders = 0, widthCommits = 0
function Draft({ id }: { id: string }) {
  renders++
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
  const [preferences, setPreferences] = React.useState<PanelWidths | undefined>()
  const [echo, setEcho] = React.useState(false)
  const [splitWidth, setSplitWidth] = React.useState<number | undefined>()
  const [splitEcho, setSplitEcho] = React.useState(false)
  const [guard, setGuard] = React.useState<'allow' | 'deny' | 'reject'>('allow')
  React.useEffect(() => {
    Object.assign(window, { panelFixture: {
      resize: setWidth, guard: setGuard, control: setPreferences, echo: setEcho,
      splitControl: setSplitWidth, splitEcho: setSplitEcho,
      reset: () => setPanels([entry('root'), entry('detail'), entry('deep')]),
      inspect: () => ({ mounts, renders, widthCommits, ids: panels.map(p => p.id) }),
      resetCounts: () => { renders = 0; widthCommits = 0 },
    } })
  }, [panels])
  return <Provider initialTheme="light" theme={{ motion: 'none' }}>
    <div style={{ width, height: 600 }}><PanelHost panels={panels} onPanelsChange={setPanels} widths={preferences}
      onWidthsChange={next => { widthCommits++; if (echo) setPreferences(next) }}
      beforeClose={async () => { await new Promise(resolve => setTimeout(resolve, 20)); if (guard === 'reject') throw new Error('Guard rejected'); return guard === 'allow' }}
      onCloseError={error => { document.body.dataset.guardError = String(error) }} /></div>
    <div style={{ width: 1000, height: 300 }}><SplitView list={<p>Split list</p>} placeholder={<p>Split detail</p>} onBack={() => {}}
      listWidth={splitWidth} onListWidthChange={next => { widthCommits++; if (splitEcho) setSplitWidth(next) }} /></div>
  </Provider>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
