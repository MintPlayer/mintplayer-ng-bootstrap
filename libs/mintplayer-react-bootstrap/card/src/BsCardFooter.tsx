import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Bootstrap contextual color; emits a `text-bg-{color}` class. */
  color?: string;
}

/**
 * Plain React `card-footer` element. Renders a `div.card-footer` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardFooter = forwardRef<HTMLDivElement, PropsWithChildren<BsCardFooterProps>>(
  ({ className, color, ...rest }, ref) => (
    <div ref={ref} className={cx('card-footer', color && `text-bg-${color}`, className)} {...rest} />
  ),
);
BsCardFooter.displayName = 'BsCardFooter';
