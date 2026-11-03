import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's close button (#458 M5): a real `<button class="btn-close">`
 * inside a host box. The consumer's attributes and its click listener land on
 * the button (`mp-attrs`); a click bubbles like any native click, so there is
 * no output. No-JS tier 2: the button renders, its action is the consumer's.
 */
export interface CloseInputs {
  /** The button's accessible name. Override for localisation. */
  label: string;
  disabled: boolean;
}

export interface CloseView {
  readonly root: CoreBag;
  readonly button: CoreBag;
}

export function connectClose({ label, disabled }: CloseInputs): CloseView {
  return {
    root: { class: 'close' },
    button: { class: 'btn-close', type: 'button', 'aria-label': label, disabled: disabled ? '' : null },
  };
}

export const closeCore = defineCore<CloseInputs, object, { view: CloseView }>({
  view: ({ inputs }) => ({ view: connectClose(inputs) }),
});
