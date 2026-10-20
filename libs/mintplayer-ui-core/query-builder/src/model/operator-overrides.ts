import type { Operator } from './expression';
import type { EntitySchema, FieldType } from './field-def';
import {
  DEFAULT_OPERATOR_CATALOG,
  type OperatorCatalog,
  operatorsForType,
} from './operators';

export type OperatorOverrides = Partial<Record<string, Operator[]>>;

export interface ValidateOperatorOverridesResult {
  /** The same shape as the input, with disallowed operators stripped per field. */
  sanitized: OperatorOverrides;
  /** Human-readable warnings (one per problematic field + reason). */
  warnings: string[];
}

/**
 * Intersect each field's `Operator[]` with `OperatorCatalog[field.type]`,
 * stripping operators that don't apply for that field's type. Emits a
 * warning per offending field. Empty results after intersection produce
 * a "no operators left" warning.
 *
 * The caller decides whether to throw or use the sanitized result —
 * `bs-query-builder` calls this on every `[operatorOverrides]` change,
 * logs warnings via `console.warn`, and silently uses `sanitized`.
 */
export function validateOperatorOverrides(
  schema: EntitySchema[],
  overrides: OperatorOverrides | undefined,
  catalog: OperatorCatalog = DEFAULT_OPERATOR_CATALOG,
): ValidateOperatorOverridesResult {
  const result: ValidateOperatorOverridesResult = {
    sanitized: {},
    warnings: [],
  };
  if (!overrides) return result;

  // Build a map of field name → first matching FieldDef in the schema.
  const fieldMap = new Map<string, { entity: string; type: FieldType }>();
  for (const entity of schema) {
    for (const f of entity.fields) {
      if (!fieldMap.has(f.name)) {
        fieldMap.set(f.name, { entity: entity.name, type: f.type });
      }
    }
  }

  for (const [fieldName, rawOps] of Object.entries(overrides)) {
    const ops = rawOps ?? [];
    const fieldInfo = fieldMap.get(fieldName);
    if (!fieldInfo) {
      result.warnings.push(
        `[operatorOverrides] Unknown field "${fieldName}" — no entity in schema declares it. Override ignored.`,
      );
      continue;
    }
    const allowed = new Set(operatorsForType(fieldInfo.type, catalog));
    const valid: Operator[] = [];
    const invalid: Operator[] = [];
    for (const op of ops) {
      if (allowed.has(op)) valid.push(op);
      else invalid.push(op);
    }
    if (invalid.length > 0) {
      result.warnings.push(
        `[operatorOverrides] Field "${fieldName}" (${fieldInfo.entity}.${fieldName}, type=${fieldInfo.type}) `
          + `has operator(s) [${invalid.join(', ')}] not in the catalog for that type. Stripping.`,
      );
    }
    if (valid.length === 0 && ops.length > 0) {
      result.warnings.push(
        `[operatorOverrides] Field "${fieldName}" has no valid operators after intersection — empty operator dropdown.`,
      );
    }
    result.sanitized[fieldName] = valid;
  }

  return result;
}

