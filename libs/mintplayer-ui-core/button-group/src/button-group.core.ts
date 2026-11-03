import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's button group (#458 M5): a `role="group"` `.btn-group` around
 * the consumer's buttons, named by `label`. No-JS tier 2: presentational.
 */
export type ButtonGroupSize = 'sm' | 'lg';

export interface ButtonGroupInputs {
  /** The group's accessible name (`aria-label`); a group of unnamed buttons needs one. */
  label: string | null;
  /** Stack the buttons (`.btn-group-vertical`). */
  vertical: boolean;
  /** Bootstrap's `btn-group-sm` / `btn-group-lg`; `null` is the default size. */
  size: ButtonGroupSize | null;
}

export interface ButtonGroupProps {
  root: CoreBag;
}

export function connectButtonGroup({ label, vertical, size }: ButtonGroupInputs): CoreBag {
  return {
    class: [vertical ? 'btn-group-vertical' : 'btn-group', size && `btn-group-${size}`].filter(Boolean).join(' '),
    role: 'group',
    'aria-label': label,
  };
}

export const buttonGroupCore = defineCore<ButtonGroupInputs, object, ButtonGroupProps>({
  view: ({ inputs }) => ({ root: connectButtonGroup(inputs) }),
});
