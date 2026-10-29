import type { ComputedRef, InjectionKey } from 'vue';

/** What `BsRadioGroup` hands its radios: one name, the selection and the shared flags. */
export interface RadioGroupContext {
  readonly name: ComputedRef<string>;
  readonly value: ComputedRef<string | null>;
  readonly disabled: ComputedRef<boolean>;
  readonly required: ComputedRef<boolean>;
  select(value: string): void;
}

export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('bs-radio-group');
