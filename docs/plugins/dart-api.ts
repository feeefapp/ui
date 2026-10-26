import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'
import type { ApiComponent, ApiProp } from './api'

const ID = 'virtual:feeef-dart-api'
const RESOLVED = '\0' + ID

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** The text between an opening bracket at `start` and its match (strings and comments skipped). */
function balanced(source: string, start: number): string {
  const open = source[start]
  const close = open === '{' ? '}' : open === '(' ? ')' : ']'
  let depth = 0
  for (let i = start; i < source.length; i++) {
    const c = source[i]
    if (c === "'" || c === '"') {
      const end = source.indexOf(c, i + 1)
      i = end < 0 ? source.length : end
    } else if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i)
      if (i < 0) break
    } else if (c === open) depth++
    else if (c === close && --depth === 0) return source.slice(start + 1, i)
  }
  return source.slice(start + 1)
}

/** Splits a parameter or field list on top-level commas. */
function topLevel(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if ('({[<'.includes(c)) depth++
    // `=>` in a default value is not a closing generic.
    if (')}]'.includes(c) || (c === '>' && list[i - 1] !== '=')) depth--
    if (c === ',' && depth === 0) {
      out.push(current)
      current = ''
    } else current += c
  }
  if (current.trim()) out.push(current)
  return out.map((p) => p.trim()).filter(Boolean)
}

/** `/// lines` right above `index`, joined as prose (code spans keep their backticks). */
function docBefore(source: string, index: number): string {
  const lines = source.slice(0, index).split('\n')
  lines.pop()
  const doc: string[] = []
  while (lines.length) {
    const line = lines.pop()!.trim()
    if (line.startsWith('///')) doc.unshift(line.replace(/^\/\/\/ ?/, ''))
    else if (line.startsWith('@') || line === '') {
      if (doc.length) break
    } else break
  }
  return doc.join(' ').replace(/\[([^\]]+)\]/g, '`$1`').trim()
}

/** Widget classes and their constructor props: the Flutter side of the API tables. */
function parse(file: string, root: string): ApiComponent[] {
  const source = readFileSync(file, 'utf8')
  const out: ApiComponent[] = []
  const classes = /^(?:abstract |final |base )*class ([A-Z]\w*)(?:<[^{]*>)? extends ([\w<>, ]+?)(?: with [\w<>, ]+?)?(?: implements [\w<>, ]+?)? \{/gm
  for (const match of source.matchAll(classes)) {
    const [, name, base] = match
    if (!/Widget|State\b|InheritedWidget|StatelessWidget|StatefulWidget/.test(base)) continue
    const bodyStart = match.index! + match[0].length - 1
    const body = balanced(source, bodyStart)
    const ctor = new RegExp(`(?:const )?${name}\\(`).exec(body)
    if (!ctor) continue
    const params = balanced(body, ctor.index + ctor[0].length - 1)
    const named = params.trim().startsWith('{') ? balanced(params, params.indexOf('{')) : params
    // Field types and docs: `/// doc\n final Type a, b;`
    const fields = new Map<string, { type: string; doc: string }>()
    for (const field of body.matchAll(/^\s*final ([^;=]+?) (\w+(?:, \w+)*);/gm)) {
      const doc = docBefore(body, field.index! + field[0].indexOf('final'))
      for (const n of field[2].split(', ')) fields.set(n, { type: field[1].trim(), doc })
    }
    const props: ApiProp[] = []
    for (const param of topLevel(named)) {
      const m = /^(required )?(?:this|super)\.(\w+)(?:\s*=\s*([\s\S]+))?$/.exec(param)
      if (!m || m[2] === 'key') continue
      const [, required, prop, value] = m
      const field = fields.get(prop)
      props.push({
        name: prop,
        type: field?.type ?? (prop === 'child' ? 'Widget' : prop === 'children' ? 'List<Widget>' : 'dynamic'),
        required: Boolean(required),
        defaultValue: value ? value.replace(/\s+/g, ' ').trim() : null,
        description: field?.doc ?? '',
      })
    }
    out.push({
      name,
      description: docBefore(source, match.index!),
      source: relative(root, file),
      props,
      inherits: [],
    })
  }
  return out
}

/**
 * Exposes `virtual:feeef-dart-api`: every public widget's constructor props, read from the Flutter
 * package (`flutter/lib`), keyed by class name like the TypeScript API. Docs show it when the reader
 * picks Flutter.
 */
export function dartApiPlugin(lib: string, root: string): Plugin {
  const build = () => {
    const api: Record<string, ApiComponent> = {}
    const files: string[] = []
    for (const file of walk(lib)) {
      if (!file.endsWith('.dart')) continue
      files.push(relative(root, file))
      if (file.endsWith('.g.dart')) continue
      for (const doc of parse(file, root)) api[doc.name] ??= doc
    }
    return { api, files }
  }
  return {
    name: 'feeef-dart-api',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const { api, files } = build()
      return `export default ${JSON.stringify(api)}\nexport const files = ${JSON.stringify(files)}`
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(lib) || !file.endsWith('.dart')) return
      const module = server.moduleGraph.getModuleById(RESOLVED)
      if (module) server.moduleGraph.invalidateModule(module)
      server.ws.send({ type: 'full-reload' })
    },
  }
}
