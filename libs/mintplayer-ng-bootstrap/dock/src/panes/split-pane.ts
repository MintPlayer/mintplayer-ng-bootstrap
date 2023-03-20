import { SplitPaneOrientation } from "../types/split-pane-orientation.type";
import { BsDockPane } from "./dock-pane";

export class BsSplitPane extends BsDockPane {
    constructor(data?: Partial<BsSplitPane>) {
        super();
        Object.assign(this, data);
    }

    orientation: SplitPaneOrientation = 'horizontal';
    panes: BsDockPane[] = [];
}