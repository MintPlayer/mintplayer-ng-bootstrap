import { BsDockPane } from "./dock-pane";
import { BsTabGroupPane } from "./tab-group-pane";

export class BsDocumentHost extends BsDockPane {
    constructor(data?: Partial<BsDocumentHost>) {
        super();
        Object.assign(this, data);
    }

    rootPane?: BsTabGroupPane
}