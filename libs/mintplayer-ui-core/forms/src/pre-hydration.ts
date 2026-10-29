/**
 * Text typed into a server-rendered control before hydration lives only in the
 * DOM: the framework's `[value]` binding then overwrites it with the core's
 * initial value, and a replayed input event reads the already-blanked field, so
 * it is lost. A front calls this while its host still holds the SERVER DOM (the
 * Angular constructor, before the first client render) and keeps the answer as
 * the core's value.
 *
 * Returns the typed text, or `null` when there is nothing to adopt (no node,
 * empty, or equal to what the core already holds).
 */
export function preHydrationValue(
  root: ParentNode | null | undefined,
  current: string,
  selector = 'input, textarea',
): string | null {
  const node = root?.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  const typed = node?.value ?? '';
  return typed && typed !== current ? typed : null;
}

/**
 * A choice made in a server-rendered radio set before hydration. The server
 * writes the `checked` ATTRIBUTE on the initially selected radio, so a radio
 * that is `:checked` without it was picked by the user; the framework's
 * `[checked]` binding would revert it. Call it while the host still holds the
 * server DOM. Returns that radio's value, or `null` when nothing changed.
 */
export function preHydrationChoice(root: ParentNode | null | undefined): string | null {
  return root?.querySelector<HTMLInputElement>('input[type=radio]:checked:not([checked])')?.value ?? null;
}
