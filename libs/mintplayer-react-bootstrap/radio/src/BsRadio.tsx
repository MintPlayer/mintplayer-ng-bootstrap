import * as React from 'react';
import { createContext, forwardRef, useContext, useId, useState } from 'react';
import { connectRadio, radioClasses, type RadioType } from '@mintplayer/ui-core/radio';
import type { ToggleButtonColor } from '@mintplayer/ui-core/checkbox';
import { reactProps } from '../../machine/src/react-props';
import { bootstrapForms, installBootstrap } from '@mintplayer/ui-core/bootstrap';

/** What `BsRadioGroup` hands its radios. `value` is `undefined` when the group is uncontrolled. */
export interface RadioGroupContextValue {
  readonly name: string;
  readonly value: string | null | undefined;
  readonly defaultValue: string | null | undefined;
  readonly disabled: boolean;
  readonly required: boolean;
  select(value: string): void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

type InputAttributes = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked' | 'value' | 'children' | 'color' | 'name'
>;

export interface BsRadioProps extends InputAttributes {
  type?: RadioType;
  /** Button colour of a `toggle_button`; ignored by `radio`. */
  color?: ToggleButtonColor;
  /** The value the group reports when this radio is picked. */
  value?: string;
  /** Controlled checked state, for a radio outside a `BsRadioGroup`. */
  checked?: boolean;
  defaultChecked?: boolean;
  /** Only for a radio outside a `BsRadioGroup`; inside one, the group's name wins. */
  name?: string;
  invalid?: boolean;
  errorText?: string | null;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

/**
 * A native `<input type=radio>` in Bootstrap's `.form-check` / `.btn-check`
 * markup (#437). Inside a `BsRadioGroup` it takes the group's name and
 * selection, so the browser supplies one-of-N and arrow-key selection.
 * Consumer props (`aria-*`, `id`, `tabIndex`, handlers) land on the input.
 * The ref is the input.
 */
export const BsRadio = forwardRef<HTMLInputElement, BsRadioProps>(function BsRadio(props, ref) {
  installBootstrap(bootstrapForms);
  const {
    type = 'radio',
    color = 'secondary',
    value,
    checked,
    defaultChecked,
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

  const group = useContext(RadioGroupContext);
  const reactId = useId();
  const rootId = `bs-radio-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [uncontrolled, setUncontrolled] = useState(!!defaultChecked);

  // A controlled group selects by value; an uncontrolled one leaves the inputs native.
  const groupChecked = group && group.value !== undefined ? group.value !== null && group.value === value : undefined;
  const isChecked = groupChecked ?? checked ?? (group ? undefined : uncontrolled);

  const state = {
    type,
    checked: !!isChecked,
    disabled: !!disabled || !!group?.disabled,
    required: !!required || !!group?.required,
    invalid,
    name: group?.name ?? name ?? null,
    value: value ?? null,
    errorText: errorText ?? null,
  };
  const bags = connectRadio(state, rootId, consumerDescribedBy);
  const classes = radioClasses(type, color, invalid);
  const inputId = consumerId ?? String(bags.input.id);

  const checkedProps = isChecked === undefined
    ? { defaultChecked: group?.defaultValue != null && group.defaultValue === value }
    : { checked: isChecked };

  const control = (
    <input
      ref={ref}
      className={[classes.input, className].filter(Boolean).join(' ')}
      {...reactProps(bags.input)}
      {...rest}
      id={inputId}
      type="radio"
      {...checkedProps}
      onChange={(event) => {
        onChange?.(event);
        if (group && value !== undefined) group.select(value);
        if (!group && checked === undefined) setUncontrolled(event.target.checked);
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
