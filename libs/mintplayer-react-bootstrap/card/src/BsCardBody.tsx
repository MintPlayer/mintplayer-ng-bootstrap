import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { bootstrapCard, installBootstrap } from '@mintplayer/ui-core/bootstrap';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-body` element. Renders a `div.card-body`; the card part (#452) styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardBody = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => {
    installBootstrap(bootstrapCard);
    return <div ref={ref} data-mps="card" className={cx('card-body', className)} {...rest} />;
  },
);
BsCardBody.displayName = 'BsCardBody';
