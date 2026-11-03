import * as React from 'react';
import { forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Plain React `card-text` element. Renders a `div.card-text`; the card part (#452) styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardText = forwardRef<HTMLDivElement, PropsWithChildren<HTMLAttributes<HTMLDivElement>>>(
  ({ className, ...rest }, ref) => {
    installBootstrap(bootstrapCard);
    return <div ref={ref} data-mps="card" className={cx('card-text', className)} {...rest} />;
  },
);
BsCardText.displayName = 'BsCardText';
