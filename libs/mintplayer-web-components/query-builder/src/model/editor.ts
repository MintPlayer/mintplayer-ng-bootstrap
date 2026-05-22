import type { Operator } from './expression';
import type { FieldDef } from './field-def';
export interface EditorContext {
  field: FieldDef;
  operator: Operator;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}

export interface EditorHandle {
  element: HTMLElement;
  dispose?: () => void;
}

export type EditorFactory = (ctx: EditorContext) => EditorHandle;

export type EditorRegistry = Record<string, EditorFactory>;
