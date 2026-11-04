import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's floating label (#458 M5): `.form-floating` around the consumer's
 * control and its `<label>`, in that order (Bootstrap's sibling rules need the
 * label after the control). `.form-floating` anchors the forms part, so the
 * control's `.form-control` / `.form-select` is styled inside it with no
 * `bs-form` around it.
 *
 * The label floats over the control by CSS alone, which LOOKS labelled while a
 * screen reader announces an unnamed textbox. So once attached, a label
 * without `for` is pointed at the control (which gets an id if it has none).
 * A consumer's own `for` / `id` are left alone. Write them yourself for a page
 * that must be labelled without JS (no-JS tier 2).
 */
let instances = 0;

export function associateFloatingLabel(host: Element): void {
  const control = host.querySelector<HTMLElement>('input, select, textarea');
  const label = host.querySelector<HTMLLabelElement>('label');
  if (!control || !label || label.htmlFor) return;
  if (!control.id) control.id = `mp-floating-label-${++instances}`;
  label.htmlFor = control.id;
}

export const floatingLabelCore = defineCore<Record<never, never>, object, { root: CoreBag }>({
  view: () => ({ root: { class: 'form-floating' } }),
  attach: (api) => {
    associateFloatingLabel(api.host);
    return () => undefined;
  },
});
