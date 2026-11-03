import { Children, isValidElement, useRef, type ReactNode } from 'react';
import { sameContent, type ContentChild } from '@mintplayer/ui-core/component';

/** A manifest content query: the component it collects, and the wrapper whose props ride along. */
export interface ReactContentQuery {
  readonly type: unknown;
  readonly within?: unknown;
  /**
   * A declaration's slots (#458 Q15; `default` is its children). They are not
   * inputs: `lentSlots` hands them to the template, which renders them.
   */
  readonly slots?: readonly string[];
}

interface Collected {
  readonly props: Record<string, unknown>;
  readonly within: Record<string, unknown> | null;
}

function collect(children: ReactNode, query: ReactContentQuery, within: Record<string, unknown> | null, out: Collected[]): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown> & { children?: ReactNode };
    if (child.type === query.type) out.push({ props, within });
    // Fragments and plain elements are transparent; a component of the consumer's own is opaque.
    else collect(props.children, query, query.within !== undefined && child.type === query.within ? withoutChildren(props) : within, out);
  });
}

function withoutChildren(props: Record<string, unknown>): Record<string, unknown> {
  const { children: _children, ref: _ref, ...rest } = props;
  return rest;
}

/**
 * A manifest content query in React (PRD #437 D10): the props of every
 * `query.type` element in `children`, read from the declaration while
 * rendering, so the server render has them. The previous array is kept while
 * nothing changed, so the core sees the same input.
 */
export function useContent(children: ReactNode, query: ReactContentQuery): readonly ContentChild[] {
  const found: Collected[] = [];
  collect(children, query, null, found);
  const slots = new Set(query.slots ?? []);
  const next = found.map(({ props, within }) => ({
    inputs: Object.fromEntries(Object.entries(withoutChildren(props)).filter(([key]) => !slots.has(key))),
    within,
  }));
  const latest = useRef<readonly ContentChild[]>(next);
  if (!sameContent(latest.current, next)) latest.current = next;
  return latest.current;
}

/**
 * The slots each declaration a content query collects lends its parent's
 * template (#458 Q15): its slot props, and its children as `default`. In the
 * same order as `useContent`.
 */
export function lentSlots(children: ReactNode, query: ReactContentQuery): ReadonlyArray<Partial<Record<string, ReactNode>>> {
  const found: Collected[] = [];
  collect(children, query, null, found);
  return found.map(({ props }) =>
    Object.fromEntries((query.slots ?? []).map((slot) => [slot, (slot === 'default' ? props['children'] : props[slot]) as ReactNode])),
  );
}
