import { fillClasses, type BsColor } from '@mintplayer/ui-core/color';
import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's badge (#458 M5): a `.badge` around the consumer's content. No-JS
 * tier 2 — presentational, the server render is the whole component.
 */
export interface BadgeInputs {
  /** A colour name; `.badge` paints white text, so each fills with a contrasting pair. */
  color: BsColor;
  /**
   * What the number counts ('unread messages'): a bare '3' badge is
   * meaningless out of visual context. Appended visually hidden.
   */
  unit: string | null;
  /** A purely decorative badge leaves the accessibility tree entirely. */
  decorative: boolean;
}

export interface BadgeProps {
  root: CoreBag;
  /** The visually hidden unit, with its leading space; `null` renders nothing. */
  unit: string | null;
}

export function badgeClasses(color: string | null | undefined): string {
  // `.badge` sets white text: a transparent badge must take the surrounding colour back.
  const fill = color === 'transparent' ? ['bg-transparent', 'text-reset'] : fillClasses(color);
  return ['badge', ...fill].join(' ');
}

export function connectBadge({ color, decorative }: Pick<BadgeInputs, 'color' | 'decorative'>): CoreBag {
  return { class: badgeClasses(color), 'aria-hidden': decorative ? 'true' : null };
}

export const badgeCore = defineCore<BadgeInputs, object, BadgeProps>({
  view: ({ inputs }) => ({ root: connectBadge(inputs), unit: inputs.unit ? ` ${inputs.unit}` : null }),
});
