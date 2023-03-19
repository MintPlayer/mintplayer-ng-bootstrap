import { BsDockPane } from "./dock-pane";
import { BsFloatingPane } from "./floating-pane";

export interface BsDockLayout {
    rootPane: BsDockPane;
    floatingPanes: BsFloatingPane[];
}