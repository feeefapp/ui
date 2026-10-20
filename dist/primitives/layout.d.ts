import * as React from 'react';
export declare const LabBox: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & {
    as?: "div" | "header" | "nav" | "main" | "aside" | "section" | "article" | "footer" | "span";
} & React.RefAttributes<HTMLElement>>;
export declare function LabText({ as: Component, ...props }: React.HTMLAttributes<HTMLElement> & {
    as?: 'span' | 'p' | 'small' | 'b' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4';
}): React.JSX.Element;
export declare function LabLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.JSX.Element;
export declare function LabForm(props: React.FormHTMLAttributes<HTMLFormElement>): React.JSX.Element;
export declare function LabList(props: React.HTMLAttributes<HTMLUListElement>): React.JSX.Element;
export declare function LabListItem(props: React.LiHTMLAttributes<HTMLLIElement>): React.JSX.Element;
export declare function LabDivider(): React.JSX.Element;
export declare function LabStyle({ children }: {
    children: string;
}): React.JSX.Element;
//# sourceMappingURL=layout.d.ts.map