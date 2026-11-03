import * as React from 'react';
import { forwardRef, AnchorHTMLAttributes, PropsWithChildren } from 'react';
import { installBootstrap } from '@mintplayer/ui-core/bootstrap';
import { bootstrapCard } from '@mintplayer/ui-core/bootstrap/card';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link target. */
  href?: string;
}

/**
 * Plain React `card-link` element. Renders an `a.card-link`; the card part (#452) styles it. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardLink = forwardRef<HTMLAnchorElement, PropsWithChildren<BsCardLinkProps>>(
  ({ className, href, ...rest }, ref) => {
    installBootstrap(bootstrapCard);
    return <a ref={ref} data-mps="card" className={cx('card-link', className)} href={href} {...rest} />;
  },
);
BsCardLink.displayName = 'BsCardLink';
