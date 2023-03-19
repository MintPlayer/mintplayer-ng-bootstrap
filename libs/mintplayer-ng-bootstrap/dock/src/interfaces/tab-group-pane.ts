import { BsDockPane } from "./dock-pane";

export interface BsTabGroupPane extends BsDockPane {
    panes: BsDockPane[];
}