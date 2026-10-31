import * as React from 'react';
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import {
  checkboxClasses,
  connectCheckbox,
  effectiveIndeterminate,
  type CheckboxType,
  type ToggleButtonColor,
} from '@mintplayer/ui-core/checkbox';
import { reactProps } from '../../machine/src/react-props';
import { bootstrapForms, installBootstrap } from '@mintplayer/ui-core/bootstrap';

type InputAttributes = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'value' | 'role' | 'children' | 'color'
>;

export interface BsCheckboxProps extends InputAttributes {
  type?: CheckboxType;
  /** Button colour of a `toggle_button`; ignored by the other types. */
  color?: ToggleButtonColor;
  /** Controlled checked state. Pair with `onCheckedChange`. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  /** The mixed state of a checkbox / switch; a user toggle reports `onCheckedChange` and the consumer clears it. */
  indeterminate?: boolean;
  /** Submitted value while checked (the platform default is `on`). */
  value?: string;
  /** Marks the control invalid: `is-invalid` and `aria-invalid`. */
  invalid?: boolean;
  /** A persistent validation message, shown and wired with aria-errormessage while `invalid`. */
  errorText?: string | null;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Checkbox, switch or toggle button: a native `<input type=checkbox>` in
 * Bootstrap's `.form-check` / `.form-switch` / `.btn-check` markup (#437),
 * with the ARIA contract from `@mintplayer/ui-core/checkbox`. Consumer props
 * (`aria-*`, `id`, `tabIndex`, handlers) land on the input; `role` is not
 * accepted, it is part of the contract (`switch` / `button`). The ref is the input.
 */
export const BsCheckbox = forwardRef<HTMLInputElement, BsCheckboxProps>(function BsCheckbox(props, ref) {
  installBootstrap(bootstrapForms);
  const {
    type = 'checkbox',
    color = 'primary',
    checked,
    defaultChecked,
    indeterminate = false,
    value,
    name,
    disabled,
    required,
    invalid = false,
    errorText,
    onCheckedChange,
    onChange,
    className,
    children,
    id: consumerId,
    'aria-describedby': consumerDescribedBy,
    ...rest
  } = props;

  const reactId = useId();
  const rootId = `bs-checkbox-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [uncontrolled, setUncontrolled] = useState(!!defaultChecked);
  const isChecked = checked ?? uncontrolled;

  const state = {
    type,
    checked: isChecked,
    indeterminate: effectiveIndeterminate({ type, indeterminate }),
    disabled: !!disabled,
    required: !!required,
    invalid,
    name: name ?? null,
    value: value ?? null,
    errorText: errorText ?? null,
  };
  const bags = connectCheckbox(state, rootId, consumerDescribedBy);
  const classes = checkboxClasses(type, color, invalid);
  const inputId = consumerId ?? String(bags.input.id);

  // indeterminate has no attribute; aria-checked="mixed" carries it in server HTML.
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state.indeterminate;
  }, [state.indeterminate]);

  const control = (
    <input
      ref={inputRef}
      className={[classes.input, className].filter(Boolean).join(' ')}
      {...reactProps(bags.input)}
      {...rest}
      // the switch role is the contract; a plain checkbox keeps a consumer role.
      role={bags.input.role === null ? (rest as { role?: string }).role : String(bags.input.role)}
      id={inputId}
      type="checkbox"
      checked={isChecked}
      onChange={(event) => {
        onChange?.(event);
        if (checked === undefined) setUncontrolled(event.target.checked);
        onCheckedChange?.(event.target.checked);
      }}
    />
  );

  const feedback = bags.feedback && <div {...reactProps(bags.feedback.attrs)}>{bags.feedback.text}</div>;

  if (classes.root === null) {
    return (
      <>
        {control}
        <label className={classes.label} htmlFor={inputId}>{children}</label>
        {feedback}
      </>
    );
  }
  return (
    <>
      <label className={classes.root}>
        {control}
        <span className={classes.label}>{children}</span>
      </label>
      {feedback}
    </>
  );
});
