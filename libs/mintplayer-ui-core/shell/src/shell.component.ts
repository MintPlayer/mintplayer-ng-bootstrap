import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The shell's manifest (#458 M4): `@mintplayer/nx-component-compiler` generates
 * `bs-shell` (Angular), `BsShell` (React, Vue) and `mp-shell` (Lit) from it, the
 * core in `shell.core.ts` and the template in `templates/`.
 */
export default {
  group: 'shell',
  style: { scope: 'shell' },
  components: {
    shell: {
      core: 'shellCore',
      doc: [
        'A responsive app shell with a collapsible sidebar (#458). Tier 1 no-JS: one native checkbox per',
        'viewport mode is the open state, so the server-rendered page opens and closes with JavaScript off.',
        '',
        'Fill the `topbar` and `sidebar` slots; the default content is the main region. `toggle()` opens',
        'or closes the sidebar in the current mode, and `statechange` reports every change made through',
        'the shell.',
      ].join('\n'),
      inputs: {
        type: 'ShellInputs',
        fields: {
          state: { default: "'auto'", kind: 'string', reflect: true },
          breakpoint: { default: "'md'", kind: 'string', reflect: true },
          size: { default: 'null', kind: 'string' },
          externalToggle: { default: 'false', reflect: true },
          dismissOnNavigate: { default: 'false' },
          labels: { default: 'null', kind: false },
        },
      },
      outputs: {
        statechange: { type: 'ShellStateChange', doc: 'The sidebar opened or closed through the shell (hamburger, toggle(), dismiss).' },
      },
      methods: {
        type: 'ShellMethods',
        fields: {
          toggle: { doc: 'Open or close the sidebar in the current viewport mode.' },
        },
      },
    },
  },
} satisfies ComponentGroup;
