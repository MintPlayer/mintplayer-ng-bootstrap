import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-body` element. Renders a `div.card-body` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardBody = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-body', className)} {...rest} />,
);
BsCardBody.displayName = 'BsCardBody';
