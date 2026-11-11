import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from '../src/provider'
import { Scaffold, ScaffoldSide, ScaffoldToggleButton, useScaffold } from '../src/workspace/scaffold'
import { MovingBrand } from '../src/workspace/moving-brand'
import { FoAnimatedLogo } from '../src/brand/logo'
import { Panel, PanelHost, type PanelEntry } from '../src/containers/panel-host'
import { ToolbarGroup } from '../src/toolbar'
import { Button } from '../src/primitives/button'
import { ListRow, ListSection } from '../src/primitives/list'
import { TextField } from '../src/primitives/text-field'

let renders = 0
function Body({ detail = false }: { detail?: boolean }) {
  renders++
  return detail ? <><h2>Product details</h2><TextField hint="Draft name" defaultValue="Boron" /><p>Published · 3,900 DA</p></> : <><h1>Products</h1><p>Every store’s catalog.</p><ListSection>{Array.from({ length: 35 }, (_, i) => <ListRow key={i} title={`Product ${i + 1}`} subtitle="Published · 3,900 DA" />)}</ListSection></>
}
function Brand({ side = false }: { side?: boolean }) {
  return <span data-tool-brand-anchor={side ? 'side' : 'header'} style={{ display: 'inline-flex', width: 104, height: 26 }}><FoAnimatedLogo width={104} height={26} /></span>
}
function Navigation() {
  const state = useScaffold()
  return state.compact || state.sideMode !== 'expanded' ? <><ToolbarGroup label="Navigation"><ScaffoldToggleButton /></ToolbarGroup><Brand /></> : null
}
function Fixture() {
  const host = React.useRef<HTMLDivElement>(null)
  const [sideMode, setSideMode] = React.useState<'expanded' | 'rail' | 'hidden'>('expanded')
  const [width, setWidth] = React.useState(1200)
  React.useEffect(() => { Object.assign(window, { chromeFixture: { resize: setWidth, side: setSideMode, inspect: () => ({ renders }) } }) }, [])
  return <Provider initialTheme="light" i18n={{ locale: 'en', dir: 'ltr' }} theme={{ palette: 'mono', motion: 'none' }}><div ref={host} style={{ width: '100%', maxWidth: width, height: '100dvh' }}>
    <Scaffold sideMode={sideMode} onSideModeChange={setSideMode} side={<ScaffoldSide leading={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Brand side /><ScaffoldToggleButton /></div>}><ListSection><ListRow title="Overview" /><ListRow title="Products" selected /></ListSection></ScaffoldSide>}
      appBar={<div style={{ display: 'flex', gap: 'var(--lab-shell-gap)', alignItems: 'center' }}><Navigation /><ToolbarGroup label="Tools"><Button appearance="toolbar" variant="text">Refresh</Button></ToolbarGroup><MovingBrand host={host} /></div>}
      renderViewport={({ appBar }) => <Panels appBar={appBar} />}><Body /></Scaffold>
  </div></Provider>
}
function Panels({ appBar }: { appBar: React.ReactNode }) {
  const [panels] = React.useState<readonly PanelEntry[]>([{ id: 'list', minWidth: 320, panel: <Panel label="Products" header={appBar}><Body /></Panel> }, { id: 'detail', minWidth: 280, panel: <Panel label="Product" title="Product"><Body detail /></Panel> }])
  // Keep the live chrome prop fresh while retaining content identity.
  return <PanelHost panels={[{ ...panels[0], panel: <Panel label="Products" header={appBar}><Body /></Panel> }, panels[1]]} onPanelsChange={() => {}} />
}
createRoot(document.getElementById('root')!).render(<Fixture />)
