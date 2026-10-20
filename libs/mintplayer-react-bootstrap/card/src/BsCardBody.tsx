import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-body` element. Renders a `div.card-body`; the page baseline styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardBody = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-body', className)} {...rest} />,
);
BsCardBody.displayName = 'BsCardBody';
