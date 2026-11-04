import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

type LinkProps = { className?: string | ((...args: never[]) => string | undefined) };

const withClass = (className: LinkProps['className'], added: string): LinkProps['className'] =>
  typeof className === 'function'
    ? (...args: never[]) => [className(...args), added].filter(Boolean).join(' ')
    : [className, added].filter(Boolean).join(' ');

/**
 * A component's consumer links (its direct child elements), marked with a
 * Bootstrap class only. Consumer DOM is never stamped: the nav part reaches
 * it through its anchor (`.nav-link:where([data-mps], :is(.nav, .navbar-nav)[data-mps] *)`).
 * A router `Link`/`NavLink` passes it on to its `<a>`; a `className` function is kept and extended.
 */
export function markLinks(children: ReactNode, className: string): ReactNode {
  return Children.map(children, (child) =>
    isValidElement<LinkProps>(child)
      ? cloneElement(child as ReactElement<LinkProps>, { className: withClass(child.props.className, className) })
      : child,
  );
}
