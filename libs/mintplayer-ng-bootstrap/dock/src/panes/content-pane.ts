import { BsDockPanelComponent } from "../dock-panel/dock-panel.component";
import { BsDockPane } from "./dock-pane";

export class BsContentPane extends BsDockPane {
    constructor(data?: Partial<BsContentPane>) {
        super();
        Object.assign(this, data);
    }

    dockPanel!: BsDockPanelComponent;
    isPinned?: boolean;
}