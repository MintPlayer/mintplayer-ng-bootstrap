import * as React from 'react';
import { createComponent } from '@lit/react';
import {
  BS_THEME_DEFAULT_MODES,
  MpThemeToggle,
  type BsThemeToggleMode,
} from '@mintplayer/web-components/theming';

export interface BsThemeToggleProps extends React.HTMLAttributes<MpThemeToggle> {
  /**
   * The modes the toggle cycles through, in order. Defaults to
   * `BS_THEME_DEFAULT_MODES` (auto, light, dark). Assigned to the element as a
   * JS property: an array cannot travel as an attribute.
   */
  modes?: readonly BsThemeToggleMode[];
}

/** Inner `@lit/react` component: `modes` is an element property, so it is set on the element, not serialised. */
const MpThemeToggleComponent = createComponent({
  react: React,
  tagName: 'mp-theme-toggle',
  elementClass: MpThemeToggle,
}) as unknown as React.ForwardRefExoticComponent<
  BsThemeToggleProps & React.RefAttributes<MpThemeToggle>
>;

/**
 * React wrapper for `<mp-theme-toggle>`, the colour-mode toggle button.
 * Side-effect-registers the WC on import.
 *
 * The toggle talks to the shared theme store itself, so it needs no props to
 * work; read or drive the same state from code with `useBsTheme()`. Any other
 * prop (`aria-label`, `id`, `className`, ...) is forwarded to the element.
 *
 *     <BsThemeToggle />
 *     <BsThemeToggle modes={[...BS_THEME_DEFAULT_MODES, sepia]} />
 */
export const BsThemeToggle = React.forwardRef<MpThemeToggle, BsThemeToggleProps>(function BsThemeToggle(
  { modes, ...rest },
  ref,
) {
  // Always hand the element a list: `@lit/react` writes `undefined` to the
  // property when a previously passed prop is removed, which would leave the
  // toggle with nothing to cycle through.
  return <MpThemeToggleComponent ref={ref} modes={modes ?? BS_THEME_DEFAULT_MODES} {...rest} />;
});
