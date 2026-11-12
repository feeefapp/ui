import * as React from 'react';
export declare const Box: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & {
    as?: "div" | "header" | "nav" | "main" | "aside" | "section" | "article" | "footer" | "span";
} & React.RefAttributes<HTMLElement>>;
export declare function Text({ as: Component, ...props }: React.HTMLAttributes<HTMLElement> & {
    as?: 'span' | 'p' | 'small' | 'b' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4';
}): React.JSX.Element;
export declare function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.JSX.Element;
export declare function Form(props: React.FormHTMLAttributes<HTMLFormElement>): React.JSX.Element;
export declare function List(props: React.HTMLAttributes<HTMLUListElement>): React.JSX.Element;
export declare function ListItem(props: React.LiHTMLAttributes<HTMLLIElement>): React.JSX.Element;
export declare function Divider(): React.JSX.Element;
export declare function Style({ children }: {
    children: string;
}): React.JSX.Element;
//# sourceMappingURL=layout.d.ts.map