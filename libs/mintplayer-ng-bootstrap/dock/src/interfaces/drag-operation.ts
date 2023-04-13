import { BsFloatingPane } from "../panes/floating-pane";

export interface DragOperation {
    offsetX: number;
    offsetY: number;
    floatingPane: BsFloatingPane
}