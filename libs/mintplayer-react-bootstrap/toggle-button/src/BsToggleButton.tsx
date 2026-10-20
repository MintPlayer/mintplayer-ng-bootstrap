import { forwardRef } from 'react';
import { BsCheckbox, type BsCheckboxProps } from '../../checkbox/src/BsCheckbox';

export type BsToggleButtonProps = Omit<BsCheckboxProps, 'type' | 'indeterminate'>;

/**
 * A single Bootstrap on/off button: `<BsCheckbox type="toggle_button">`, an
 * `input.btn-check` + `label.btn` with `role=button` and `aria-pressed`
 * (#437). Controlled with `checked` + `onCheckedChange`; the ref is the input.
 */
export const BsToggleButton = forwardRef<HTMLInputElement, BsToggleButtonProps>(function BsToggleButton(props, ref) {
  return <BsCheckbox {...props} ref={ref} type="toggle_button" />;
});
