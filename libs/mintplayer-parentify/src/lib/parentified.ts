export type Parentified<T> = {
    $parent: any;
} & T;