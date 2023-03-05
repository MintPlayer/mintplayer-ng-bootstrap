import { Point } from "./point";

export interface DragOperation {
    operation: EDragOperation;
    startPosition: Point;
    sizes: number[];
    indexBefore: number;
    indexAfter: number;
}

export enum EDragOperation {
    none,
    resizeSplitter,
}