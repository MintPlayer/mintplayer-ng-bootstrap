import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Cap colour. */
  color?: CardColor;
}

/**
 * Plain React `card-footer` element. Renders a `div.card-footer`; the page baseline styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardFooter = forwardRef<HTMLDivElement, PropsWithChildren<BsCardFooterProps>>(
  ({ className, color, ...rest }, ref) => (
    <div ref={ref} className={cx('card-footer', ...capColorClasses(color), className)} {...rest} />
  ),
);
BsCardFooter.displayName = 'BsCardFooter';
