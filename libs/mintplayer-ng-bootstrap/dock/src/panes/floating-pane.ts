import { BsDockPane } from "./dock-pane";
import { Point } from "../interfaces/point";
import { Size } from "../interfaces/size";

export class BsFloatingPane {
    pane?: BsDockPane;
    size?: Size;
    location?: Point;
}