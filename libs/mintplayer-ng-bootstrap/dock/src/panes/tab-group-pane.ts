import { BsContentPane } from "./content-pane";
import { BsDockPane } from "./dock-pane";

export class BsTabGroupPane extends BsDockPane {
    constructor(data?: Partial<BsTabGroupPane>) {
        super();
        Object.assign(this, data);
    }

    panes: BsContentPane[] = [];
}