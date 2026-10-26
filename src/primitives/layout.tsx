import * as React from 'react'

export const Box = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'header' | 'nav' | 'main' | 'aside' | 'section' | 'article' | 'footer' | 'span'
  }
>(({ as = 'div', ...props }, ref) => React.createElement(as, { ...props, ref }))

Box.displayName = 'Box'

export function Text({
  as: Component = 'span',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p' | 'small' | 'b' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4'
}) {
  return <Component {...props} />
}

export function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}

export function Form(props: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} />
}

export function List(props: React.HTMLAttributes<HTMLUListElement>) {
  return <ul {...props} />
}

export function ListItem(props: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li {...props} />
}

export function Divider() {
  return <hr />
}

export function Style({ children }: { children: string }) {
  return <style>{children}</style>
}
