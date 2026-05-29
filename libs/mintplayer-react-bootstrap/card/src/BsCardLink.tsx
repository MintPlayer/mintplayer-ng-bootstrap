import * as React from 'react';
import { forwardRef, AnchorHTMLAttributes, PropsWithChildren } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface BsCardLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link target. */
  href?: string;
}

/**
 * Plain React `card-link` element. Renders an `a.card-link` that gets
 * slotted into `<mp-card>` and styled by mp-card's shadow + the global
 * card sheet. Merges an incoming `className` and spreads remaining props.
 */
export const BsCardLink = forwardRef<HTMLAnchorElement, PropsWithChildren<BsCardLinkProps>>(
  ({ className, href, ...rest }, ref) => <a ref={ref} className={cx('card-link', className)} href={href} {...rest} />,
);
BsCardLink.displayName = 'BsCardLink';
