import type { Operator } from './expression';

export interface QueryBuilderMessages {
  addCondition: string;
  addGroup: string;
  addSubquery: string;
  removeRow: string;
  removeGroup: string;
  logicAnd: string;
  logicOr: string;
  saveCurrentAs: string;
  loadQuery: string;
  deleteQuery: string;
  treeTooDeep: string;
  dropHerePlaceholder: string;
  operators: Partial<Record<Operator, string>>;
}

export const DEFAULT_MESSAGES: QueryBuilderMessages = {
  addCondition: 'Add condition',
  addGroup: 'Add group',
  addSubquery: 'Add sub-query',
  removeRow: 'Remove',
  removeGroup: 'Remove group',
  logicAnd: 'AND',
  logicOr: 'OR',
  saveCurrentAs: 'Save current as…',
  loadQuery: 'Load',
  deleteQuery: 'Delete',
  treeTooDeep: 'Tree too deep',
  dropHerePlaceholder: 'Drop here',
  operators: {
    'equals': '=',
    'not-equals': '≠',
    'contains': 'contains',
    'does-not-contain': 'does not contain',
    'starts-with': 'starts with',
    'ends-with': 'ends with',
    'lt': '<',
    'lte': '≤',
    'gt': '>',
    'gte': '≥',
    'between': 'between',
    'not-between': 'not between',
    'in': 'in',
    'not-in': 'not in',
    'is-null': 'is null',
    'is-not-null': 'is not null',
    'is-true': 'is true',
    'is-false': 'is false',
    'today': 'is today',
    'yesterday': 'is yesterday',
    'this-week': 'is this week',
    'last-week': 'is last week',
    'next-week': 'is next week',
    'this-month': 'is this month',
    'last-month': 'is last month',
    'next-month': 'is next month',
    'this-year': 'is this year',
    'last-year': 'is last year',
    'next-year': 'is next year',
    'last-n-days': 'is in the last N days',
    'next-n-days': 'is in the next N days',
    'year-to-date': 'is year-to-date',
    'any-of': 'any of',
    'all-of': 'all of',
    'none-of': 'none of',
    'is-empty': 'is empty',
    'is-not-empty': 'is not empty',
  },
};
