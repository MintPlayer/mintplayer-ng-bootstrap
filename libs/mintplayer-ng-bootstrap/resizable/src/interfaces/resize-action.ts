export interface ResizeAction {
    top?: ResizeActionSide;
    start?: ResizeActionSide;
    bottom?: ResizeActionSide;
    end?: ResizeActionSide;
}

export interface ResizeActionSide {
    /** Fixed edge */
    edge: number;

    /** Initial margin at the fixed edge */
    margin: number;

    /** Initial margin at the edge that's being dragged */
    dragMargin: number;

    /** Initial size */
    size: number;
}