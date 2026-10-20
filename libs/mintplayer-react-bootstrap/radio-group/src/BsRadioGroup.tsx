import * as React from 'react';
import { forwardRef, useId, useMemo } from 'react';
import { connectRadioGroup, radioGroupName } from '@mintplayer/ui-core/radio';
import { RadioGroupContext, type RadioGroupContextValue } from '../../radio/src/BsRadio';
import { reactProps } from '../../machine/src/react-props';

export interface BsRadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** The radios' shared name; generated when omitted, so native grouping always forms. */
  name?: string;
  /** Controlled selection. Pair with `onValueChange`. */
  value?: string | null;
  /** Uncontrolled initial selection. */
  defaultValue?: string | null;
  disabled?: boolean;
  required?: boolean;
  onValueChange?: (value: string) => void;
  /** Native change events of the radios, bubbled to the group element. */
  onChange?: React.FormEventHandler<HTMLDivElement>;
}

/**
 * A `<div role=radiogroup>` around `BsRadio`s (#437). It hands them one name,
 * so they are native radios of one set: the browser supplies exclusivity, the
 * single tab stop and arrow move-and-select, with JavaScript off as well. Name
 * the group with `aria-label` / `aria-labelledby`; the ref is the group element.
 */
export const BsRadioGroup = forwardRef<HTMLDivElement, BsRadioGroupProps>(function BsRadioGroup(props, ref) {
  const { name, value, defaultValue, disabled = false, required = false, onValueChange, children, ...rest } = props;
  const reactId = useId();
  const groupName = name ?? radioGroupName(`bs-radio-group-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`);

  const context = useMemo<RadioGroupContextValue>(() => ({
    name: groupName,
    value,
    defaultValue,
    disabled,
    required,
    // Uncontrolled, the checked inputs themselves hold the selection.
    select(next) {
      onValueChange?.(next);
    },
  }), [groupName, value, defaultValue, disabled, required, onValueChange]);

  return (
    // The bag goes last: radiogroup is the contract role, not a consumer choice.
    <div ref={ref} {...rest} {...reactProps(connectRadioGroup({ required, disabled }))}>
      <RadioGroupContext.Provider value={context}>{children}</RadioGroupContext.Provider>
    </div>
  );
});
