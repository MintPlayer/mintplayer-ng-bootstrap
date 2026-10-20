export type OverlayOriginX = 'start' | 'center' | 'end';
export type OverlayOriginY = 'top' | 'center' | 'bottom';

export interface OverlayPosition {
  /** Which X corner of the anchor to align from. */
  originX: OverlayOriginX;
  /** Which Y corner of the anchor to align from. */
  originY: OverlayOriginY;
  /** Which X corner of the overlay panel to align to. */
  overlayX: OverlayOriginX;
  /** Which Y corner of the overlay panel to align to. */
  overlayY: OverlayOriginY;
  /** Optional pixel offset, applied after corner alignment. */
  offsetX?: number;
  offsetY?: number;
}
