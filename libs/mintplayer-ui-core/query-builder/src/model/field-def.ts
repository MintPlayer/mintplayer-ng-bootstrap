export type FieldType =
  | 'string' | 'number' | 'integer'
  | 'date' | 'datetime'
  | 'boolean' | 'enum' | 'relation'
  | 'array';

export interface FieldDefOption {
  value: unknown;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: FieldDefOption[];
  targetEntity?: string;
  /**
   * `'custom'` renders the condition's value through the query builder's
   * `editor` slot instead of the built-in editor for the field's type.
   */
  editor?: 'builtin' | 'custom';
}

export interface EntitySchema {
  name: string;
  label: string;
  fields: FieldDef[];
}
