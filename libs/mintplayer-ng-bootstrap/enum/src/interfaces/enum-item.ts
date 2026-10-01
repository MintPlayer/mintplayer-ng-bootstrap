export interface EnumItem<V = number> {
    key: string;
    /** The member value: a number for a numeric enum; pass V = string for a string enum. */
    value: V;
}
