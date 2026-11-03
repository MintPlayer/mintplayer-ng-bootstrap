import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-group` element. Renders a `div.card-group` that wraps
 * `<BsCard>`s Merges an incoming
 * `className` and spreads remaining props.
 */
export const BsCardGroup = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => {
    installBootstrap(bootstrapCard);
    return <div ref={ref} data-mps="card" className={cx('card-group', className)} {...rest} />;
  },
);
BsCardGroup.displayName = 'BsCardGroup';
