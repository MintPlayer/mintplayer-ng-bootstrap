import { Children, isValidElement, useRef, type ReactNode } from 'react';
import { sameContent, type ContentChild } from '@mintplayer/ui-core/component';

/** A manifest content query: the component it collects, and the wrapper whose props ride along. */
export interface ReactContentQuery {
  readonly type: unknown;
  readonly within?: unknown;
}

function collect(children: ReactNode, query: ReactContentQuery, within: Record<string, unknown> | null, out: ContentChild[]): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const { children: inner, ref: _ref, ...props } = child.props as Record<string, unknown> & { children?: ReactNode };
    if (child.type === query.type) out.push({ inputs: props, within });
    // Fragments and plain elements are transparent; a component of the consumer's own is opaque.
    else collect(inner, query, query.within !== undefined && child.type === query.within ? props : within, out);
  });
}

/**
 * A manifest content query in React (PRD #437 D10): the props of every
 * `query.type` element in `children`, read from the declaration while
 * rendering, so the server render has them. The previous array is kept while
 * nothing changed, so the core sees the same input.
 */
export function useContent(children: ReactNode, query: ReactContentQuery): readonly ContentChild[] {
  const next: ContentChild[] = [];
  collect(children, query, null, next);
  const latest = useRef<readonly ContentChild[]>(next);
  if (!sameContent(latest.current, next)) latest.current = next;
  return latest.current;
}
