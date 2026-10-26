import { type RefObject } from 'react';
/**
 * Springs the composer capsule between layouts: when its second row opens or closes, a line is
 * added, or attachments appear, its height and every slot move together on one spring
 * (`SPRINGS.snappy`), mixed in the capsule's own pixels (`composerFrame`). The field keeps its
 * node, focus and caret; only its clip height and offset animate. Slots are the capsule grid's
 * children marked `data-composer-slot`. Reduced motion jumps.
 */
export declare function useComposerMotion(capsule: RefObject<HTMLElement | null>): void;
//# sourceMappingURL=use-composer-motion.d.ts.map