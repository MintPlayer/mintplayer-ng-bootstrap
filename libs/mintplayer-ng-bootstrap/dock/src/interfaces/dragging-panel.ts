import { Parentified } from "@mintplayer/parentify";
import { BsDockPanelComponent } from "../dock-panel/dock-panel.component";
import { BsContentPane } from "../panes/content-pane";

export interface DraggingPanel {
    component: BsDockPanelComponent;
    pane: Parentified<BsContentPane>;
}