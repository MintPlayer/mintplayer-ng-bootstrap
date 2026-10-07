/**
 * Whether a click inside the overflow panel was an item ACTION, which should close the panel.
 *
 * The first interactive element on the event path, between the target and the panel, decides:
 *  - a link, button or menuitem-like role closes the panel, because activating it did something;
 *  - unless it opens a menu of its own (`aria-haspopup`, `aria-expanded`, `<summary>`), or is
 *    disabled, in which case the user is not done with the panel;
 *  - a form control or label keeps the panel open, as does a click that hits no interactive
 *    element at all (padding, plain text).
 *
 * Walks `composedPath()`, not `target.closest()`: a nested web component's trigger lives in its
 * shadow root, where `closest()` from the retargeted host would never see it.
 */
export function isClosingActivation(path: readonly EventTarget[], panel: Element): boolean {
  const end = path.indexOf(panel);
  if (end < 0) return false;
  const control = path
    .slice(0, end)
    .find((target): target is Element => target instanceof Element && target.matches(INTERACTIVE));
  if (!control || !control.matches(ACTION)) return false;

  const popup = control.getAttribute('aria-haspopup');
  if (popup !== null && popup !== 'false') return false;
  if (control.hasAttribute('aria-expanded')) return false;
  if (control.getAttribute('aria-disabled') === 'true') return false;
  return !control.matches(':disabled');
}

const ACTION = [
  'a[href]',
  'button',
  '[role=button]',
  '[role=link]',
  '[role=menuitem]',
  '[role=menuitemcheckbox]',
  '[role=menuitemradio]',
].join(',');

/** Everything that stops the walk: the actions, plus the controls that must keep the panel open. */
const INTERACTIVE = [ACTION, 'summary', 'input', 'select', 'textarea', 'label'].join(',');
