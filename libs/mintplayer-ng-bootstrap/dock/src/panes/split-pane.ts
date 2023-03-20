import { ESplitPaneOrientation } from "../enums";
import { BsDockPane } from "./dock-pane";

export class BsSplitPane extends BsDockPane {
    constructor(data?: Partial<BsSplitPane>) {
        super();
        Object.assign(this, data);
    }

    orientation = ESplitPaneOrientation.horizontal;
    panes: BsDockPane[] = [];
}