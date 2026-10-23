/** An attribute bag as a `@mintplayer/ui-core` `connect()` returns it. */
export type AttrBag = Record<string, string | boolean | null>;

/**
 * Turn a core's attribute bag into `v-bind` input. In a bag `true` means "present and empty",
 * but Vue renders a non-boolean attribute bound to `true` as `"true"`, so it becomes `''`;
 * `null` (absent) Vue already removes. The Vue counterpart of React's `reactProps()`, so every
 * front writes the same DOM.
 */
export function vueProps(bag: AttrBag): Record<string, string | false | null> {
  return Object.fromEntries(Object.entries(bag).map(([name, value]) => [name, value === true ? '' : value]));
}

/** A style bag as a core's `connect()` returns it: CSS property names, `null` for unset. */
export type StyleBag = Record<string, string | null>;

/** Turn a core's style bag into a `:style` object: `null` is dropped, names (custom properties too) are kept as they are. */
export function vueStyle(bag: StyleBag): Record<string, string> {
  return Object.fromEntries(Object.entries(bag).filter((entry): entry is [string, string] => entry[1] !== null));
}
