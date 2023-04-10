export interface ResizeAction {
    top?: ResizeActionSide;
    start?: ResizeActionSide;
    bottom?: ResizeActionSide;
    end?: ResizeActionSide;
}

export interface ResizeActionSide {
    edge: number;
    margin: number;
    dragMargin: number;
}