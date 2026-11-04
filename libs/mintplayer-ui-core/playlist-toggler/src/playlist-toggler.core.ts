import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * The playlist toggle (#458 M8): a real `<button>` with three bars drawn as a
 * play arrow while closed and a cross while `open`.
 *
 *   <span class="playlist-toggler-host">
 *     <button type=button class="playlist-toggler [open]" aria-label=<label>
 *             aria-expanded aria-controls=<controls>>
 *       <span class="playlist-toggler-line"></span> ×3
 *     </button>
 *   </span>
 *
 * `open` is two-way. With `toggleOnClick` off the button only reports state
 * someone else owns. No-JS tier 2: the button is disabled until hydrated,
 * since nothing can toggle before then; its server `aria-expanded` is the
 * `open` input.
 */
export interface PlaylistTogglerInputs {
  /** Whether the controlled playlist is shown. Two-way. */
  open: boolean;
  /** Flip `open` on click. Off when the playlist's owner drives `open` itself. */
  toggleOnClick: boolean;
  /** The button's accessible name. Override for localisation; a consumer `aria-label` wins. */
  label: string;
  /** The id of the region the button shows and hides. */
  controls: string | null;
}

export interface PlaylistTogglerView {
  readonly root: CoreBag;
  readonly button: CoreBag;
  readonly line: CoreBag;
}

export const PLAYLIST_TOGGLER_ATTR = 'data-playlist-toggler';

export function connectPlaylistToggler(
  { label, controls }: Pick<PlaylistTogglerInputs, 'label' | 'controls'>,
  open: boolean,
  hydrated: boolean,
  consumerLabel: string | null = null,
): PlaylistTogglerView {
  return {
    root: { class: 'playlist-toggler-host' },
    button: {
      class: open ? 'playlist-toggler open' : 'playlist-toggler',
      type: 'button',
      'aria-label': consumerLabel ?? label,
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': controls || null,
      disabled: hydrated ? null : '',
      [PLAYLIST_TOGGLER_ATTR]: '',
    },
    line: { class: 'playlist-toggler-line' },
  };
}

export const playlistTogglerCore = defineCore<PlaylistTogglerInputs, { open: boolean }, { view: PlaylistTogglerView }, { openChange: boolean }>({
  state: (inputs) => ({ open: !!inputs.open }),
  view: ({ inputs, state, hydrated, label }) => ({ view: connectPlaylistToggler(inputs, state.open, hydrated, label) }),
  attach: (api) => {
    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${PLAYLIST_TOGGLER_ATTR}]`);
      if (!button || !api.host.contains(button) || api.inputs().toggleOnClick === false) return;
      const open = !api.state().open;
      api.setState({ open });
      api.emit('openChange', open);
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
