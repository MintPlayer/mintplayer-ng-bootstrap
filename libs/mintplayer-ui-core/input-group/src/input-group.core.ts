import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/** Bootstrap's input-group sizes. `md` is the default and adds no class. */
export type InputGroupSize = 'sm' | 'md' | 'lg';

export interface InputGroupInputs {
  /** Bootstrap sizing; `md` adds no class. */
  size: InputGroupSize;
  /**
   * The group's accessible name. A named group is a `group`; an unnamed one is
   * decorative and has no role (it would only add noise to the accessibility
   * tree). A group named by `aria-labelledby` passes `role="group"` itself.
   */
  label: string | null;
}

export interface InputGroupProps {
  root: CoreBag;
}

/**
 * The input group has no state: its root is Bootstrap's `div.input-group`, its
 * content the group's direct children, so Bootstrap's `.input-group > *` rules
 * join them as written. The scoped sheet covers what those direct-child
 * selectors miss (RTL, a control rendered inside a framework host).
 */
export function connectInputGroup({ size, label }: InputGroupInputs): CoreBag {
  return {
    class: size === 'sm' || size === 'lg' ? `input-group input-group-${size}` : 'input-group',
    role: label ? 'group' : null,
    'aria-label': label || null,
  };
}

export const inputGroupCore = defineCore<InputGroupInputs, object, InputGroupProps>({
  view: ({ inputs }) => ({ root: connectInputGroup(inputs) }),
});
