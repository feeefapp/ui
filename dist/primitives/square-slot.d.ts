import * as React from 'react';
import './square-slot.css';
export type SquareSlotProps = React.HTMLAttributes<HTMLSpanElement>;
/**
 * A square as tall as its row with its content centred: the leading icon or the trailing badge,
 * count or chevron of a row. In a `Button` it is the button's height and takes the place of the
 * padding at the end it sits on, so an icon sits centred in a square at the button's edge (a
 * button that holds only a slot is that square). `ListRow` uses it for its leading media, sized by
 * `--lab-list-leading-size`. Set `--lab-square-slot-size` to give it another side.
 */
export declare const SquareSlot: React.ForwardRefExoticComponent<SquareSlotProps & React.RefAttributes<HTMLSpanElement>>;
//# sourceMappingURL=square-slot.d.ts.map