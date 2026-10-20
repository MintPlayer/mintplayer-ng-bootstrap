import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-text` element. Renders a `div.card-text`; the page baseline styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardText = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-text', className)} {...rest} />,
);
BsCardText.displayName = 'BsCardText';
