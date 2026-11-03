import type { Ref, RefCallback } from 'react';

type Props = Record<string, unknown>;

/** One ref that sets every given ref. */
export function composeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(value);
      else if (ref) (ref as { current: T | null }).current = value;
    });
  };
}

/**
 * Merge a directive hook's props (`useBsRow()`) with the consumer's own, for
 * one element (#458 §4.3):
 *
 *     <div {...mergeProps(useBsRow(), { className: 'my-row', onClick })} />
 *
 * - `className` is joined and `style` merged;
 * - `ref`s are composed and `on*` handlers chained, the directive's first;
 * - any other prop is the consumer's when both set it (their `aria-*`, `id`,
 *   `tabIndex` win, as on a component), except `role` and the scope stamp
 *   `data-mps`, which belong to the directive's contract.
 */
export function mergeProps<A extends Props, B extends Props>(ours: A, theirs: B): A & B {
  const merged: Props = { ...ours };
  Object.entries(theirs).forEach(([name, value]) => {
    const own = merged[name];
    if (value === undefined) return;
    if (name === 'className') merged[name] = [own, value].filter(Boolean).join(' ');
    else if (name === 'style') merged[name] = { ...(own as object), ...(value as object) };
    else if (name === 'ref') merged[name] = own ? composeRefs(own as Ref<unknown>, value as Ref<unknown>) : value;
    else if (/^on[A-Z]/.test(name) && typeof own === 'function' && typeof value === 'function') {
      merged[name] = (...args: unknown[]) => {
        (own as (...a: unknown[]) => void)(...args);
        (value as (...a: unknown[]) => void)(...args);
      };
    } else if ((name === 'role' || name === 'data-mps') && own !== undefined) return;
    else merged[name] = value;
  });
  return merged as A & B;
}
