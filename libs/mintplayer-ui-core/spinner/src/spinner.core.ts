import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

export type SpinnerType = 'border' | 'grow';

export interface SpinnerInputs {
  /** `border` (a ring) or `grow` (a pulsing dot). */
  type: SpinnerType;
  /** A Bootstrap theme colour (`primary`, `dark`, …) for the `text-*` utility; `null` inherits. */
  color: string | null;
  /** Bootstrap's small size (`spinner-border-sm` / `spinner-grow-sm`). */
  small: boolean;
  /** The status text a screen reader announces; it is visually hidden. */
  label: string;
}

export interface SpinnerProps {
  root: CoreBag;
  label: string;
}

export function connectSpinner({ type, color, small }: Pick<SpinnerInputs, 'type' | 'color' | 'small'>): CoreBag {
  return {
    class: [`spinner-${type}`, small && `spinner-${type}-sm`, color && `text-${color}`].filter(Boolean).join(' '),
    role: 'status',
  };
}

export const spinnerCore = defineCore<SpinnerInputs, object, SpinnerProps>({
  view: ({ inputs }) => ({ root: connectSpinner(inputs), label: inputs.label }),
});
