/** An attribute bag as a `@mintplayer/ui-core` `connect()` returns it. */
export type AttrBag = Record<string, string | number | boolean | null>;

/** DOM attribute names whose React prop name differs. */
const RENAME: Readonly<Record<string, string>> = {
  autocomplete: 'autoComplete',
  class: 'className',
  colspan: 'colSpan',
  for: 'htmlFor',
  maxlength: 'maxLength',
  minlength: 'minLength',
  popovertarget: 'popoverTarget',
  popovertargetaction: 'popoverTargetAction',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  rowspan: 'rowSpan',
};

/**
 * Turn a core's attribute bag into JSX props: `null` (attribute absent) is
 * dropped and DOM names are mapped to React's. The React counterpart of the
 * Angular `[mpProps]` directive and Lit's attribute bindings — every front
 * applies the same bag, so ARIA cannot drift between them.
 *
 * `true` means present-and-empty. React stringifies it on a hyphenated
 * (`data-*`, `aria-*`) attribute, so those get `''`; a known boolean property
 * (`hidden`, `inert`) keeps `true`, because React drops it when given `''`.
 */
export function reactProps(bag: AttrBag): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(bag)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== null)
      .map(([name, value]) => [RENAME[name] ?? name, value === true && name.includes('-') ? '' : value]),
  );
}

/** A form control's state attributes, and the uncontrolled React props that only seed them. */
const SEED: Readonly<Record<string, string>> = { checked: 'defaultChecked', value: 'defaultValue' };

/**
 * `reactProps` for an `<input>` / `<select>` / `<textarea>` whose state the
 * DOM owns once rendered (a checkbox the user flips, a field script writes):
 * `checked` and `value` become `defaultChecked` / `defaultValue`, so React
 * renders them on the server and never fights the user afterwards. The
 * compiled front templates use it on every form control's bag.
 */
export function reactFormProps(bag: AttrBag): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(reactProps(bag)).map(([name, value]) => [SEED[name] ?? name, value]));
}

/**
 * `reactProps` for an `<option>`: `selected` is dropped, because React seeds an
 * option's selection from its select's `defaultValue` and warns about it on an
 * option. The other fronts render it, which is how their server HTML selects.
 */
export function reactOptionProps(bag: AttrBag): Record<string, string | number | boolean> {
  const { selected: _selected, ...rest } = bag;
  return reactProps(rest);
}

/** A style bag as a core's `connect()` returns it: CSS property names, `null` = unset. */
export type StyleBag = Record<string, string | null>;

/**
 * Turn a core's style bag into a React `style` object: `null` is dropped and
 * `grid-column` becomes `gridColumn`. Custom properties (`--x`) keep their name.
 */
export function reactStyle(bag: StyleBag): React.CSSProperties {
  return Object.fromEntries(
    Object.entries(bag)
      .filter((entry): entry is [string, string] => entry[1] !== null)
      .map(([name, value]) => [name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), value]),
  );
}
