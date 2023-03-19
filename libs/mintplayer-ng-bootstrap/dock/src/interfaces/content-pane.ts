import { BsDockPanelComponent } from "../dock-panel/dock-panel.component";
import { BsDockPane } from "./dock-pane";

export interface BsContentPane extends BsDockPane {
    dockPanel: BsDockPanelComponent;
    isPinned?: boolean;
}