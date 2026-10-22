import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { withCustomConfig, type ComponentDoc, type PropItem } from 'react-docgen-typescript'
import ts from 'typescript'
import type { Plugin } from 'vite'

/** One prop as the API tables show it. */
export interface ApiProp {
  name: string
  type: string
  required: boolean
  defaultValue: string | null
  description: string
}

/** A component's API: its own props, plus the native/third-party prop groups it also accepts. */
export interface ApiComponent {
  name: string
  description: string
  source: string
  props: ApiProp[]
  inherits: { from: string; count: number }[]
}

const ID = 'virtual:feeef-api'
const RESOLVED = '\0' + ID

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** Declared by the kit, not inherited from React's DOM types or a dependency. */
function own(prop: PropItem) {
  const files = [prop.parent?.fileName, ...(prop.declarations ?? []).map((d) => d.fileName)]
  return files.some((file) => file && !file.includes('node_modules'))
}

const LITERAL = /^("[^"]*"|'[^']*'|-?\d+(\.\d+)?|true|false|null)$/

/** Literal unions are shown member by member (`false | true` as `boolean`); anything else as written. */
function typeOf(prop: PropItem) {
  const { name, raw, value } = prop.type as { name: string; raw?: string; value?: { value: string }[] }
  if (name !== 'enum' || !Array.isArray(value) || !value.length) return raw ?? name
  const members = value.map((v) => v.value)
  if (!members.every((m) => LITERAL.test(m))) return raw ?? members.join(' | ')
  const bool = members.includes('true') && members.includes('false')
  const rest = members.filter((m) => !bool || (m !== 'true' && m !== 'false'))
  return [...rest, ...(bool ? ['boolean'] : [])].join(' | ')
}

/**
 * Default values from the component's own parameter destructuring. react-docgen-typescript
 * mixes defaults between components that share a file, so they are read from the AST instead.
 */
function defaultsOf(file: string, component: string): Map<string, string> {
  const out = new Map<string, string>()
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const fnOf = (node: ts.Node | undefined): ts.SignatureDeclaration | undefined => {
    if (!node) return
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return node
    if (ts.isCallExpression(node)) return node.arguments.map(fnOf).find(Boolean)
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return fnOf(node.expression)
  }
  let fn: ts.SignatureDeclaration | undefined
  source.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === component) fn = node
    if (ts.isVariableStatement(node))
      for (const d of node.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.name.text === component) fn = fnOf(d.initializer)
  })
  const pattern = fn?.parameters[0]?.name
  if (!pattern || !ts.isObjectBindingPattern(pattern)) return out
  for (const el of pattern.elements) {
    if (!el.initializer || el.dotDotDotToken) continue
    const key = el.propertyName ?? el.name
    const name = ts.isIdentifier(key) || ts.isStringLiteral(key) ? key.text : key.getText(source)
    out.set(name, el.initializer.getText(source))
  }
  return out
}

function inheritedFrom(prop: PropItem) {
  return prop.parent?.name ?? prop.declarations?.[0]?.name ?? 'HTML attributes'
}

function toComponent(doc: ComponentDoc, root: string): ApiComponent {
  const defaults = defaultsOf(doc.filePath, doc.displayName)
  const props: ApiProp[] = []
  const inherited = new Map<string, number>()
  for (const prop of Object.values(doc.props)) {
    if (prop.name === 'key' || prop.name === 'ref') continue
    if (!own(prop)) {
      const from = inheritedFrom(prop)
      inherited.set(from, (inherited.get(from) ?? 0) + 1)
      continue
    }
    props.push({
      name: prop.name,
      type: typeOf(prop),
      required: prop.required,
      defaultValue: defaults.get(prop.name) ?? null,
      description: prop.description,
    })
  }
  props.sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name))
  return {
    name: doc.displayName,
    description: doc.description,
    source: relative(root, doc.filePath),
    props,
    inherits: [...inherited].map(([from, count]) => ({ from, count })).sort((a, b) => b.count - a.count),
  }
}

/**
 * Exposes `virtual:feeef-api`: every component's props, read from the kit's TypeScript source
 * with react-docgen-typescript. Regenerated whenever a file under `src/` changes.
 */
export function apiPlugin(src: string): Plugin {
  const root = join(src, '..')
  let cache: Record<string, ApiComponent> | null = null
  const build = () => {
    const parser = withCustomConfig(join(root, 'tsconfig.json'), {
      savePropValueAsString: true,
      shouldExtractLiteralValuesFromEnum: true,
      shouldExtractValuesFromUnion: true,
      shouldRemoveUndefinedFromOptional: true,
      shouldIncludePropTagMap: false,
    })
    const files = walk(src).filter((f) => f.endsWith('.tsx'))
    const out: Record<string, ApiComponent> = {}
    for (const doc of parser.parse(files)) {
      if (!doc.displayName || out[doc.displayName]) continue
      out[doc.displayName] = toComponent(doc, root)
    }
    return out
  }
  return {
    name: 'feeef-api',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      cache ??= build()
      return `export default ${JSON.stringify(cache)}`
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(src) || !/\.tsx?$/.test(file)) return
      cache = null
      const mod = server.moduleGraph.getModuleById(RESOLVED)
      if (mod) server.moduleGraph.invalidateModule(mod)
    },
  }
}
