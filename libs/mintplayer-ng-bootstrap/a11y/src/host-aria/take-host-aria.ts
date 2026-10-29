/**
 * Collects a front's host attributes that belong on its role-bearing inner
 * node: `aria-*` are copied (harmless on a roleless host), `id` and `tabindex`
 * are moved, so the id is not duplicated and the host is not a second tab stop.
 *
 * Call it in the constructor: host attributes are present by then on both the
 * server and the client, so the SSR output already carries them where AT reads
 * them, and hydration sees identical DOM.
 */
export function takeHostAria(host: HTMLElement): Record<string, string> {
  const bag: Record<string, string> = Object.fromEntries(
    Array.from(host.attributes)
      .filter(({ name }) => name.startsWith('aria-') || name === 'id' || name === 'tabindex')
      .map(({ name, value }) => [name, value]),
  );
  ['id', 'tabindex'].filter((name) => name in bag).map((name) => host.removeAttribute(name));
  return bag;
}
