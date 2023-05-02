export type Parentified<T> = {
    $original: T;
    $parent: any;
} & T;