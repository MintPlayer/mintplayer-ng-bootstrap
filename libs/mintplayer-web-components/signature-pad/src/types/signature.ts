export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    points: Point[];
}

export interface Signature {
    strokes: Stroke[];
    /** Typed-signature alternative for users who cannot draw with a pointer. */
    text?: string;
}
