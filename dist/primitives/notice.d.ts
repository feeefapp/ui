import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import './notice.css';
declare const icons: {
    info: import("lucide-react").LucideIcon;
    success: import("lucide-react").LucideIcon;
    warning: import("lucide-react").LucideIcon;
    danger: import("lucide-react").LucideIcon;
};
export type NoticeProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
    /** Meaning of the accent and default icon. Defaults to info. */
    tone?: keyof typeof icons;
    /** Optional short heading above the body. */
    title?: ReactNode;
    /** Decorative icon override. Pass null to omit it. */
    icon?: ReactNode;
    /** Message, guidance, or actions displayed in the notice. */
    children: ReactNode;
};
/** Inline feedback with an inset accent stripe. Set role="status" or "alert" for live updates. */
export declare function Notice({ tone, title, icon, children, className, ...props }: NoticeProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=notice.d.ts.map