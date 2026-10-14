import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-group` element. Renders a `div.card-group` that wraps
 * `<BsCard>`s; where Bootstrap's card partial makes it a flex row, the card
 * sheet's `.card-group > mp-card` rule sizes the cards. Merges an incoming
 * `className` and spreads remaining props.
 */
export const BsCardGroup = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => <div ref={ref} className={cx('card-group', className)} {...rest} />,
);
BsCardGroup.displayName = 'BsCardGroup';
