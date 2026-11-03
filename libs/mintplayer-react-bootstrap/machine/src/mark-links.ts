import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

type LinkProps = { className?: string | ((...args: never[]) => string | undefined); 'data-mps'?: string };

const withClass = (className: LinkProps['className'], added: string): LinkProps['className'] =>
  typeof className === 'function'
    ? (...args: never[]) => [className(...args), added].filter(Boolean).join(' ')
    : [className, added].filter(Boolean).join(' ');

/**
 * A component's consumer links (its direct child elements), marked with a
 * Bootstrap class and the component's scope, so the scoped Bootstrap part
 * (`.nav-link:where([data-mps])`) styles them. A router `Link`/`NavLink` passes
 * both on to its `<a>`; a `className` function is kept and extended.
 */
export function markLinks(children: ReactNode, className: string, scope: string): ReactNode {
  return Children.map(children, (child) =>
    isValidElement<LinkProps>(child)
      ? cloneElement(child as ReactElement<LinkProps>, { className: withClass(child.props.className, className), 'data-mps': scope })
      : child,
  );
}
