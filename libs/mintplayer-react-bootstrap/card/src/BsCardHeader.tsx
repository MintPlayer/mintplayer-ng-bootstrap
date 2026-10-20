import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { capColorClasses, type CardColor } from '@mintplayer/ui-core/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Cap colour. */
  color?: CardColor;
}

/**
 * Plain React `card-header` element. A nav inside it takes Bootstrap's own
 * `card-header-tabs` / `card-header-pills` class, written on the nav.
 * Merges an incoming `className` and spreads remaining props.
 */
export const BsCardHeader = forwardRef<HTMLDivElement, PropsWithChildren<BsCardHeaderProps>>(
  ({ className, color, ...rest }, ref) => (
    <div ref={ref} className={cx('card-header', ...capColorClasses(color), className)} {...rest} />
  ),
);
BsCardHeader.displayName = 'BsCardHeader';
