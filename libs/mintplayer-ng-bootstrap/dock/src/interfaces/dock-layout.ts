import { BsDockPane } from "../panes/dock-pane";
import { BsFloatingPane } from "../panes/floating-pane";

export interface BsDockLayout {
    rootPane: BsDockPane;
    floatingPanes: BsFloatingPane[];
}