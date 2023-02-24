import { FixedEdge } from "./fixed-edge";
import { Point } from "./point";

export interface ResizeInformation {
    startMousePosition: Point;
    fixedEdges: FixedEdge[];
    // delta: Point;
}