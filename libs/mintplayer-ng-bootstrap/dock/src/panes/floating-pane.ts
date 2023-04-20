import { BsDockPane } from "./dock-pane";
import { Point } from "../interfaces/point";
import { Size } from "../interfaces/size";

export class BsFloatingPane extends BsDockPane {
    constructor(data?: Partial<BsFloatingPane>) {
        super();
        Object.assign(this, data);
    }
    
    pane?: BsDockPane;
    size?: Size;
    location?: Point;

    override get isEmpty() {
        return this.pane?.isEmpty ?? true;
    }
}