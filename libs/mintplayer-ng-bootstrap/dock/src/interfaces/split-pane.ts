import { ESplitPaneOrientation } from "../enums";
import { BsDockPane } from "./dock-pane";

export interface BsSplitPane extends BsDockPane {
    orientation: ESplitPaneOrientation;
    panes: BsDockPane[];
}