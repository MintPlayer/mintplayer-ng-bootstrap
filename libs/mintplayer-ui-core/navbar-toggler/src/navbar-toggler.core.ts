import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * The hamburger toggle (#458 M5): a real `<button>` with three bars that
 * morph into a cross while `open`.
 *
 *   <span class="navbar-toggler-host">
 *     <button type=button class="navbar-toggler [open]" aria-label=<label>
 *             aria-expanded aria-controls=<controls>>
 *       <span class="navbar-toggler-line"></span> ×3
 *     </button>
 *   </span>
 *
 * `open` is two-way. With `toggleOnClick` off the button only reports state
 * someone else owns (a shell's sidebar). No-JS tier 2: the button is disabled
 * until hydrated, since nothing can toggle before then; its server
 * `aria-expanded` is the `open` input.
 */
export interface NavbarTogglerInputs {
  /** Whether the controlled region is shown. Two-way. */
  open: boolean;
  /** Flip `open` on click. Off when the region's owner drives `open` itself. */
  toggleOnClick: boolean;
  /** The button's accessible name. Override for localisation; a consumer `aria-label` wins. */
  label: string;
  /** The id of the region the button shows and hides. */
  controls: string | null;
}

export interface NavbarTogglerView {
  readonly root: CoreBag;
  readonly button: CoreBag;
  readonly line: CoreBag;
}

export const NAVBAR_TOGGLER_ATTR = 'data-navbar-toggler';

export function connectNavbarToggler(
  { label, controls }: Pick<NavbarTogglerInputs, 'label' | 'controls'>,
  open: boolean,
  hydrated: boolean,
  consumerLabel: string | null = null,
): NavbarTogglerView {
  return {
    root: { class: 'navbar-toggler-host' },
    button: {
      class: open ? 'navbar-toggler open' : 'navbar-toggler',
      type: 'button',
      'aria-label': consumerLabel ?? label,
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': controls || null,
      disabled: hydrated ? null : '',
      [NAVBAR_TOGGLER_ATTR]: '',
    },
    line: { class: 'navbar-toggler-line' },
  };
}

export const navbarTogglerCore = defineCore<NavbarTogglerInputs, { open: boolean }, { view: NavbarTogglerView }, { openChange: boolean }>({
  state: (inputs) => ({ open: !!inputs.open }),
  view: ({ inputs, state, hydrated, label }) => ({ view: connectNavbarToggler(inputs, state.open, hydrated, label) }),
  attach: (api) => {
    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${NAVBAR_TOGGLER_ATTR}]`);
      if (!button || !api.host.contains(button) || api.inputs().toggleOnClick === false) return;
      const open = !api.state().open;
      api.setState({ open });
    };
    api.host.addEventListener('click', onClick);
    return () => api.host.removeEventListener('click', onClick);
  },
  inputsChanged: (api, prev) => {
    const open = !!api.inputs().open;
    if (open === !!prev.open || open === api.state().open) return;
    api.setState({ open });
  },
});
