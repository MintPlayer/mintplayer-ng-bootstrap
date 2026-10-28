import type { Operator } from './expression';
import type { FieldDef } from './field-def';

/**
 * What the `editor` slot renders a custom value editor with, for a field whose
 * `editor` is `'custom'`. `value` is the condition's current value; call
 * `onChange` with the next one.
 */
export interface EditorContext {
  field: FieldDef;
  operator: Operator;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}
