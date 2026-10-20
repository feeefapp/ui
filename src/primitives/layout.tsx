import * as React from 'react'

export const LabBox = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'header' | 'nav' | 'main' | 'aside' | 'section' | 'article' | 'footer' | 'span'
  }
>(({ as = 'div', ...props }, ref) => React.createElement(as, { ...props, ref }))

LabBox.displayName = 'LabBox'

export function LabText({
  as: Component = 'span',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p' | 'small' | 'b' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4'
}) {
  return <Component {...props} />
}

export function LabLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}

export function LabForm(props: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} />
}

export function LabList(props: React.HTMLAttributes<HTMLUListElement>) {
  return <ul {...props} />
}

export function LabListItem(props: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li {...props} />
}

export function LabDivider() {
  return <hr />
}

export function LabStyle({ children }: { children: string }) {
  return <style>{children}</style>
}
