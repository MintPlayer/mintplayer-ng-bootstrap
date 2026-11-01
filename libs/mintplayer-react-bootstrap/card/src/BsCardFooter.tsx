import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';
import { bootstrapCard, installBootstrap } from '@mintplayer/ui-core/bootstrap';

// #452: the card partial ships with the card, scoped to the elements it stamps.
installBootstrap(bootstrapCard);

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Cap colour. */
  color?: CardColor;
}

/**
 * Plain React `card-footer` element. Renders a `div.card-footer`; the card part (#452) styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardFooter = forwardRef<HTMLDivElement, PropsWithChildren<BsCardFooterProps>>(
  ({ className, color, ...rest }, ref) => (
    <div ref={ref} data-mps="card" className={cx('card-footer', ...capColorClasses(color), className)} {...rest} />
  ),
);
BsCardFooter.displayName = 'BsCardFooter';
