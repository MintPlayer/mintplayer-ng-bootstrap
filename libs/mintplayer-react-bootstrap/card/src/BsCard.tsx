import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { bootstrapCard, installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { cardColorClasses, type CardColor } from '@mintplayer/ui-core/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface BsCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card colour; filled by default, border-only with `outline`. */
  color?: CardColor;
  /** Colour the border only. */
  outline?: boolean;
}

/**
 * The card root (PRD #437 wave A): a plain `div.card`, no custom element and
 * no core, so SSR emits the finished card and the page baseline styles it.
 * Merges an incoming `className` and spreads remaining props.
 */
export const BsCard = forwardRef<HTMLDivElement, PropsWithChildren<BsCardProps>>(
  ({ className, color, outline = false, ...rest }, ref) => {
    installBootstrap(bootstrapCard);
    return <div ref={ref} className={cx('card', ...cardColorClasses(color, outline), className)} {...rest} />;
  },
);
BsCard.displayName = 'BsCard';
