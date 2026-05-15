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
}

export interface EntitySchema {
  name: string;
  label: string;
  fields: FieldDef[];
}
