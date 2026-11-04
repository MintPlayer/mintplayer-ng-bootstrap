import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The playlist toggler's manifest (#458 M8): `bs-playlist-toggler` (Angular),
 * `BsPlaylistToggler` (React, Vue) and `mp-playlist-toggler` (Lit).
 */
export default {
  group: 'playlist-toggler',
  style: { scope: 'playlist-toggler' },
  components: {
    'playlist-toggler': {
      core: 'playlistTogglerCore',
      doc: [
        'A button whose bars show a play arrow while closed and a cross while `open` (two-way). `controls`',
        'names the playlist it shows and hides; with `toggleOnClick` off it only reports state its owner drives.',
      ].join('\n'),
      inputs: {
        type: 'PlaylistTogglerInputs',
        fields: {
          open: { default: 'false', model: true },
          toggleOnClick: { default: 'true' },
          label: { default: "'Toggle playlist'", kind: 'string' },
          controls: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        openChange: { type: 'boolean', doc: 'The user toggled the button.' },
      },
    },
  },
} satisfies ComponentGroup;
