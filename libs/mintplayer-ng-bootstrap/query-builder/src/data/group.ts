import { BsQueryRule } from "./rule";

export interface BsQueryGroup<TData> {
    operator: 'AND' | 'OR';
    items: (BsQueryRule<TData> | BsQueryGroup<TData>)[];
}