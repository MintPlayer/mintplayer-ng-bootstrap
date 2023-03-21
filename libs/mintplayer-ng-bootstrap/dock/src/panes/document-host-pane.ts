import { BsDockPane } from "./dock-pane";

export class BsDocumentHost extends BsDockPane {
    constructor(data?: Partial<BsDocumentHost>) {
        super();
        Object.assign(this, data);
    }

    rootPane?: BsDockPane
}