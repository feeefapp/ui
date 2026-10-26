import type { ComponentType } from 'react'

export type DocSection = 'get-started' | 'guidelines' | 'foundations' | 'components'

export const SECTIONS: { id: DocSection; title: string }[] = [
  { id: 'get-started', title: 'Get started' },
  { id: 'guidelines', title: 'Guidelines' },
  { id: 'foundations', title: 'Foundations' },
  { id: 'components', title: 'Components' },
]

/** Component groups, in navigation order. */
export const GROUPS = [
  'Actions',
  'Inputs',
  'Selection',
  'Date and time',
  'Containment',
  'Navigation and layout',
  'Feedback and motion',
  'Studio',
] as const
export type DocGroup = (typeof GROUPS)[number]

/** What an example module exports next to its default component. */
export interface ExampleMeta {
  title: string
  description?: string
  /** Lower first. Defaults to file name order. */
  order?: number
}

export interface DocExample extends ExampleMeta {
  id: string
  Demo: ComponentType
  source: string
  /** The same example for the Flutter twin (`feeef_ui`), when the component has one. */
  dart?: string
}

export interface DocPage {
  section: DocSection
  /** URL slug: `/components/<id>`. */
  id: string
  title: string
  /** One sentence; shown under the title, in navigation cards and in search. */
  summary: string
  /** Components only. */
  group?: DocGroup
  /** Order inside its section or group. */
  order?: number
  /** `studio`: a product widget that is moving out of the kit; documented, not recommended. */
  status?: 'stable' | 'studio'
  /** The import line shown in the page header. */
  importLine?: string
  /** Kit source file, relative to the repo root (`src/primitives/button.tsx`). */
  source?: string
  /** Component names whose props the API tab lists, in order. */
  api?: string[]
  /** Extra words that should find this page in search. */
  keywords?: string[]
  /** Page body (Overview tab for components). */
  Overview: ComponentType
  /** Examples tab, components only. */
  examples?: DocExample[]
  /** Small live preview for the components index. */
  Preview?: ComponentType
}

export function definePage(page: DocPage): DocPage {
  return page
}

type ExampleModule = { default: ComponentType; meta: ExampleMeta }

/** Drops the `meta` export from an example's source so the code panel shows only the demo. */
function demoSource(source: string) {
  return source.replace(/\nexport const meta[\s\S]*?\n}\n/, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Builds a page's examples from two `import.meta.glob` calls over `./examples/*.tsx`:
 * the modules (for the live demo) and the same files as raw text (for the code panel).
 */
/** A Flutter example without its file header (imports), trimmed; undefined when there is none. */
function dartSource(source: unknown) {
  if (typeof source !== 'string') return undefined
  return source.replace(/^(\/\/[^\n]*\n)+/, '').trim()
}

export function examplesFrom(
  modules: Record<string, unknown>,
  sources: Record<string, unknown>,
  /** `./examples/*.dart` raw sources: the Flutter version of each example, same file name. */
  dart: Record<string, unknown> = {}
): DocExample[] {
  return Object.entries(modules)
    .map(([path, mod], index) => {
      const { default: Demo, meta } = mod as ExampleModule
      const id = path.split('/').pop()!.replace(/\.tsx$/, '')
      return {
        id,
        ...meta,
        order: meta.order ?? index,
        Demo,
        source: demoSource(String(sources[path] ?? '')),
        dart: dartSource(dart[path.replace(/\.tsx$/, '.dart')]),
      }
    })
    .sort((a, b) => a.order! - b.order!)
}
