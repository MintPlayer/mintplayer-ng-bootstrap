import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-text` element. Renders a `div.card-text` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardText = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-text', className)} {...rest} />,
);
BsCardText.displayName = 'BsCardText';
