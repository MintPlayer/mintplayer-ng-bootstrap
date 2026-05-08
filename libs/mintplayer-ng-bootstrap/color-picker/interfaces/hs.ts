/**
 * Hue + Saturation pair shared between the wheel and the strips.
 * Saturation is HSV-saturation (0..1) — at S=0 the color is white at V=1
 * and gray at V<1. (Not HSL-saturation; HSL would put gray at S=0 regardless of L.)
 */
export interface HS {
    hue: number;
    saturation: number;
}