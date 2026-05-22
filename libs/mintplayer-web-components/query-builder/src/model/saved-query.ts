import type { Expression } from './expression';
export interface SavedQuery {
  name: string;
  tree: Expression;
  createdAt?: string;
}
