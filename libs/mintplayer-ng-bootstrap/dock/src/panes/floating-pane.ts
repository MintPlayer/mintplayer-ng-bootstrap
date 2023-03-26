import { BsDockPane } from "./dock-pane";
import { Point } from "../interfaces/point";
import { Size } from "../interfaces/size";

export class BsFloatingPane {
    constructor(data?: Partial<BsFloatingPane>) {
        Object.assign(this, data);
    }
    
    pane?: BsDockPane;
    size?: Size;
    location?: Point;
}