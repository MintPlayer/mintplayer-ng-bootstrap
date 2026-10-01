import { ResizablePositioning } from "../types/positioning";

/** A physical edge of the box, after `start`/`end` are resolved against the text direction. */
export type PhysicalSide = 'top' | 'bottom' | 'left' | 'right';

/** The geometry captured when a resize begins; every move is computed from it. */
export interface ResizeAction {
    positioning: ResizablePositioning;

    /** The physical edges the active glyph drags. */
    sides: PhysicalSide[];

    /** The box's viewport rect at the start of the resize. */
    rect: { left: number; top: number; width: number; height: number };

    /** The box's offsetLeft/offsetTop: its position in its containing block. */
    offset: { left: number; top: number };

    /** The box's computed margins, in px. */
    margin: { left: number; right: number; top: number; bottom: number };
}
