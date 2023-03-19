import { BsDockPane } from "./dock-pane";

export interface BsDocumentHost extends BsDockPane {
    rootPane: BsDockPane
}