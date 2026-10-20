/** An attribute bag as a `@mintplayer/ui-core` `connect()` returns it. */
export type AttrBag = Record<string, string | boolean | null>;

/** DOM attribute names whose React prop name differs. */
const RENAME: Readonly<Record<string, string>> = {
  autocomplete: 'autoComplete',
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
};

/**
 * Turn a core's attribute bag into JSX props: `null` (attribute absent) is
 * dropped and DOM names are mapped to React's. The React counterpart of the
 * Angular `[mpProps]` directive and Lit's attribute bindings — every front
 * applies the same bag, so ARIA cannot drift between them.
 */
export function reactProps(bag: AttrBag): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(bag)
      .filter((entry): entry is [string, string | boolean] => entry[1] !== null)
      .map(([name, value]) => [RENAME[name] ?? name, value]),
  );
}
