import { BsDockPane } from "./dock-pane";
import { Point } from "./point";
import { Size } from "./size";

export interface BsFloatingPane {
    pane: BsDockPane;
    size: Size;
    location: Point;
}