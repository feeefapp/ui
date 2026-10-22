import { useEffect, useState, type CSSProperties } from 'react'
import { Check, Copy } from 'lucide-react'
import type { HighlighterCore } from 'shiki/core'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { useLabServices } from '@feeef.dev/ui/services'
import { cn } from '@feeef.dev/ui/utils'

export type CodeLang = 'tsx' | 'bash' | 'css' | 'json' | 'html'

let highlighter: Promise<HighlighterCore> | null = null

/** One small Shiki instance (five grammars, JS regex engine) shared by every code block. */
function load() {
  highlighter ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
  ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
    createHighlighterCore({
      themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
      langs: [
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/html.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  )
  return highlighter
}

function useHighlighted(code: string, lang: CodeLang) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    load().then((h) => {
      if (!live) return
      setHtml(
        h.codeToHtml(code, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      )
    })
    return () => {
      live = false
    }
  }, [code, lang])
  return html
}

export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const { copyText } = useLabServices()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(timer)
  }, [done])
  return (
    <LabIconButton
      variant="text"
      appearance="toolbar"
      controlSize="compact"
      aria-label={done ? 'Copied' : label}
      title={done ? 'Copied' : label}
      onClick={() => copyText(text).then(() => setDone(true), () => {})}
    >
      {done ? <Check size={18} /> : <Copy size={18} />}
    </LabIconButton>
  )
}

function Source({ code, html }: { code: string; html: string | null }) {
  return html ? (
    <div className="docs-code-body" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className="docs-code-body" dir="ltr">
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Above this many lines a code box scrolls inside itself. */
const MAX_ROWS = 22

/**
 * Highlighted, copyable code on an opaque surface. Its tools float together in glass bubbles over a
 * LabScrollArea, which fades the code under them and scrolls long sources; one- and two-line snippets
 * get a single row with the copy bubble at the end. Plain text renders first, so nothing waits on Shiki.
 */
export function Code({
  code,
  lang = 'tsx',
  title,
  className,
  copy = true,
}: {
  code: string
  lang?: CodeLang
  title?: string
  className?: string
  copy?: boolean
}) {
  const html = useHighlighted(code, lang)
  const rows = code.split('\n').length
  const label = title ?? lang
  if (rows <= 2) {
    return (
      <figure className={cn('docs-code', className)} data-layout="inline" aria-label={label} data-lab-corners>
        <Source code={code} html={html} />
        {copy && (
          <LabToolbarGroup label="Code actions" className="docs-code-inline-tools">
            <CopyButton text={code} />
          </LabToolbarGroup>
        )}
      </figure>
    )
  }
  return (
    <figure
      className={cn('docs-code', className)}
      data-layout="box"
      aria-label={label}
      data-lab-corners
      style={{ '--docs-code-rows': Math.min(rows, MAX_ROWS) } as CSSProperties}
    >
      <LabScrollArea
        label={`${label} code`}
        edgeGap={8}
        contentPadding={16}
        topFadeHeight={64}
        top={
          <LabToolbar
            label={`${label} code tools`}
            leading={
              <LabToolbarGroup label="Language">
                <span className="docs-code-label">{label}</span>
              </LabToolbarGroup>
            }
            trailing={
              copy ? (
                <LabToolbarGroup label="Code actions">
                  <CopyButton text={code} />
                </LabToolbarGroup>
              ) : undefined
            }
          />
        }
      >
        <Source code={code} html={html} />
      </LabScrollArea>
    </figure>
  )
}

/** Inline `code` in prose. */
export function C({ children }: { children: string }) {
  return <code className="docs-inline-code">{children}</code>
}
