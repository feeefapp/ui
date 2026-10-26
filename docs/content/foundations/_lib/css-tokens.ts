/**
 * Reads `--lab-*` custom properties straight out of the kit's stylesheets (imported with `?raw`),
 * so the token tables on the Foundations pages can never drift from the CSS.
 */
import tokensCss from '@feeef.dev/ui/theme-tokens.css?raw'
import systemCss from '@feeef.dev/ui/system.css?raw'
import motionCss from '@feeef.dev/ui/motion.css?raw'
import scaffoldCss from '@feeef.dev/ui/scaffold.css?raw'

export interface TokenDeclaration {
  name: string
  value: string
  /** Selector chain, outermost first, joined with ` › ` (e.g. `@media (…) › html[data-lab-theme]`). */
  context: string
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Every `--lab-*` declaration in a stylesheet, with the selector chain it sits in. */
export function parseTokens(css: string): TokenDeclaration[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const stack: string[] = []
  const out: TokenDeclaration[] = []
  let buffer = ''
  const flush = () => {
    const match = /^(--lab-[\w-]+)\s*:\s*([\s\S]+)$/.exec(buffer.trim())
    if (match) out.push({ name: match[1]!, value: clean(match[2]!), context: stack.join(' › ') })
    buffer = ''
  }
  for (const char of source) {
    if (char === '{') {
      stack.push(clean(buffer))
      buffer = ''
    } else if (char === ';') flush()
    else if (char === '}') {
      flush()
      stack.pop()
    } else buffer += char
  }
  return out
}

export type TokenMap = Map<string, string>

/** Declarations from one exact selector chain, in source order. */
export function block(declarations: TokenDeclaration[], context: string): TokenMap {
  return new Map(
    declarations.filter((d) => d.context === context).map((d) => [d.name, d.value] as const)
  )
}

/** Later maps win, like the cascade (the kit's override selectors always out-specify the base). */
export function merge(...maps: TokenMap[]): TokenMap {
  const out: TokenMap = new Map()
  for (const map of maps) for (const [k, v] of map) out.set(k, v)
  return out
}

/** Substitutes `var(--lab-…)` references from the same map, so a value can be painted offline. */
export function resolveValue(map: TokenMap, value: string, depth = 0): string {
  if (depth > 8) return value
  return value.replace(/var\((--lab-[\w-]+)(?:,\s*([^()]+))?\)/g, (whole, name: string, fallback?: string) => {
    const next = map.get(name) ?? fallback
    return next === undefined ? whole : resolveValue(map, next, depth + 1)
  })
}

export const THEME = parseTokens(tokensCss)
export const SYSTEM = parseTokens(systemCss)
export const MOTION = parseTokens(motionCss)
export const SCAFFOLD = parseTokens(scaffoldCss)

export const SELECTORS = {
  base: 'html[data-lab-theme]',
  dark: "html[data-lab-theme='dark']",
  mono: "html[data-lab-palette='mono'][data-lab-theme]",
  monoDark: "html[data-lab-palette='mono'][data-lab-theme='dark']",
  compact: "html[data-lab-density='compact'][data-lab-theme]",
  thin: "html[data-lab-density='thin'][data-lab-theme]",
  reducedMotion: '@media (prefers-reduced-motion: reduce) › html[data-lab-theme]',
} as const

/** The four palette × mode combinations, fully resolved from the CSS (palette tokens + system.css). */
export function paletteMaps() {
  const themeBase = block(THEME, SELECTORS.base)
  const systemBase = block(SYSTEM, SELECTORS.base)
  const systemDark = block(SYSTEM, SELECTORS.dark)
  const base = merge(systemBase, themeBase)
  const dark = merge(base, systemDark, block(THEME, SELECTORS.dark))
  const mono = merge(base, block(THEME, SELECTORS.mono))
  const monoDark = merge(dark, block(THEME, SELECTORS.mono), block(THEME, SELECTORS.monoDark))
  return { lab: base, labDark: dark, mono, monoDark }
}

/** Token names declared by the palette files (theme-tokens.css), in source order. */
export function paletteTokenNames(): string[] {
  return [...new Set(THEME.map((d) => d.name))]
}
