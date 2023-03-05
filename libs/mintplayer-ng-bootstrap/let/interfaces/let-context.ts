export interface BsLetContext<T> {
    /**
     * using `bsLet` to enable `as` syntax: `*bsLet="foo as bar"`
     */
    bsLet: T;

    /**
     * using `$implicit` to enable `let` syntax: `*bsLet="foo; let bar"`
     */
    $implicit: T;
}