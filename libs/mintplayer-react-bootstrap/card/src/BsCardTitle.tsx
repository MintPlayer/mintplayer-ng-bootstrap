import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-title` element. Renders a `div.card-title` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardTitle = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-title', className)} {...rest} />,
);
BsCardTitle.displayName = 'BsCardTitle';
