export type Operator =
  | 'equals' | 'not-equals'
  | 'contains' | 'does-not-contain' | 'starts-with' | 'ends-with'
  | 'lt' | 'lte' | 'gt' | 'gte'
  | 'between' | 'not-between'
  | 'in' | 'not-in'
  | 'is-null' | 'is-not-null'
  | 'is-true' | 'is-false'
  | 'today' | 'yesterday'
  | 'this-week' | 'last-week' | 'next-week'
  | 'this-month' | 'last-month' | 'next-month'
  | 'this-year' | 'last-year' | 'next-year'
  | 'last-n-days' | 'next-n-days'
  | 'year-to-date'
  | 'any-of' | 'all-of' | 'none-of'
  | 'is-empty' | 'is-not-empty';

export interface Group {
  kind: 'group';
  id: string;
  logic: 'and' | 'or';
  children: Expression[];
}

export interface Condition {
  kind: 'condition';
  id: string;
  field: string;
  operator: Operator;
  value: unknown;
}

export interface SubQueryCondition {
  kind: 'subquery';
  id: string;
  field: string;
  operator: 'in' | 'not-in';
  subQuery: Group;
}

export type Expression = Group | Condition | SubQueryCondition;
