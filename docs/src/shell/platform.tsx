import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import versions from 'virtual:feeef-versions'
import { Button } from '@feeef.dev/ui/primitives/button'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import '@feeef.dev/ui/actions/actions.css'
import { useDocsSettings, type DocsSettings } from '../settings'

const REPO = 'https://github.com/feeefapp/ui/tree/'
const item = 'lab-actions-menu__item'

/**
 * Which kit the docs speak: React or its Flutter twin. It switches every example's code, the
 * import line, the source links and the API tables at once (and is remembered).
 */
export function PlatformSwitch({ appearance = 'plain' }: { appearance?: 'plain' | 'grouped' }) {
  const { settings, update } = useDocsSettings()
  return (
    <SegmentedControl<DocsSettings['code']>
      label="Docs platform"
      appearance={appearance}
      value={settings.code}
      onChange={(code) => update({ code })}
      options={[
        { value: 'react', label: 'React' },
        { value: 'flutter', label: 'Flutter' },
      ]}
    />
  )
}

const label = (version: string) => `v${version}`

/**
 * The version these docs describe, and the released versions before it. The docs are built from
 * the working tree, so commits after the newest tag show as "next"; an older version opens its
 * tagged source (both kits ship from the same tag).
 */
export function VersionMenu() {
  const unreleased = versions.ahead > 0
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="text"
          appearance="toolbar"
          controlSize="compact"
          className="docs-version-trigger"
          aria-label={`Version ${label(versions.current)}${unreleased ? ', with unreleased changes' : ''}`}
        >
          {label(versions.current)}
          {unreleased && <span className="docs-version-next">next</span>}
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <PopoverSurface asChild>
          <DropdownMenu.Content
            className="lab-actions-menu docs-version-menu"
            align="end"
            sideOffset={8}
            collisionPadding={12}
          >
            <DropdownMenu.Label className="docs-version-heading">These docs</DropdownMenu.Label>
            <DropdownMenu.Item className={item} disabled>
              <Check size={18} aria-hidden="true" />
              <span className="docs-version-name">
                {label(versions.current)}
                {unreleased && <small>+{versions.ahead} unreleased commits</small>}
              </span>
            </DropdownMenu.Item>
            {versions.releases.length > 0 && (
              <>
                <DropdownMenu.Separator className="docs-version-separator" />
                <DropdownMenu.Label className="docs-version-heading">Released</DropdownMenu.Label>
                {versions.releases.slice(0, 12).map((release) => (
                  <DropdownMenu.Item key={release.version} className={item} asChild>
                    <a href={REPO + `v${release.version}`} target="_blank" rel="noreferrer">
                      <span className="docs-version-name">
                        {label(release.version)}
                        <small>{release.date}</small>
                      </span>
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </DropdownMenu.Item>
                ))}
              </>
            )}
          </DropdownMenu.Content>
        </PopoverSurface>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
