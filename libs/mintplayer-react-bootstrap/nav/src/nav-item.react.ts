import { Children as ReactChildren, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';

/*
 * The React extension of the generated `BsNavItem` (PRD #437 D10 escape hatch):
 * the item's link becomes a `.nav-link` of the nav scope, so the nav part
 * (`.nav-link:where([data-mps])`) styles it. A router `Link` passes both on to its `<a>`.
 */

type LinkProps = { className?: string | ((...args: never[]) => string | undefined); 'data-mps'?: string };

const withLinkClass = (className: LinkProps['className']): LinkProps['className'] =>
  typeof className === 'function'
    ? (...args: never[]) => [className(...args), NAV_LINK_CLASS].filter(Boolean).join(' ')
    : [className, NAV_LINK_CLASS].filter(Boolean).join(' ');

export function Children({ children }: { children?: ReactNode }) {
  return ReactChildren.map(children, (child) =>
    isValidElement<LinkProps>(child)
      ? cloneElement(child as ReactElement<LinkProps>, { className: withLinkClass(child.props.className), 'data-mps': 'nav' })
      : child,
  );
}
