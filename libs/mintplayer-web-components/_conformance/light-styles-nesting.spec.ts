import { beforeEach, describe, expect, it } from 'vitest';

import { getLightStyleEntries } from '@mintplayer/web-components/light-dom';
import '@mintplayer/web-components/file-manager';
import '@mintplayer/web-components/datatable';
import '@mintplayer/web-components/treeview';
import '@mintplayer/web-components/tree-select';

/**
 * The nesting rule, discovered the hard way: a light-tier component's stylesheet
 * is installed at DOCUMENT level, and document styles do not cross a shadow
 * boundary. So a component that keeps its shadow root but renders a light-tier
 * component INSIDE it starves that child of its styles — the original #408 bug,
 * one level up.
 *
 * `mp-file-manager` is the case in this repo (it renders mp-datatable and
 * mp-treeview in its shadow root). It must mirror the light-style registry onto
 * its own root via `adoptLightStyles`.
 *
 * This suite exists so the next shadow-DOM component that embeds a light-tier
 * one fails here instead of shipping silently unstyled.
 */

const LIGHT_TIER_TAGS = ['mp-datatable', 'mp-treeview', 'mp-tree-select'] as const;

/** Shadow-rooted hosts that render a light-tier component inside themselves. */
const SHADOW_HOSTS_EMBEDDING_LIGHT_TIER = ['mp-file-manager'] as const;

describe('light-tier components nested inside a shadow root', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('registers a sheet for every light-tier component', () => {
    const keys = getLightStyleEntries().map((e) => e.key);
    // Importing the elements above must have installed their sheets; an empty
    // registry would make every assertion below vacuous.
    expect(keys).toEqual(expect.arrayContaining(['datatable', 'treeview', 'tree-select']));
  });

  for (const tag of SHADOW_HOSTS_EMBEDDING_LIGHT_TIER) {
    it(`${tag} mirrors the light-style registry into its shadow root`, async () => {
      const host = document.createElement(tag) as HTMLElement & {
        updateComplete?: Promise<unknown>;
      };
      document.body.appendChild(host);
      await host.updateComplete;

      const root = host.shadowRoot;
      expect(root, `${tag}: expected a shadow root`).not.toBeNull();

      const entries = getLightStyleEntries();
      for (const entry of entries) {
        // Either the constructed sheet was adopted, or the <style> fallback was
        // appended — both count; the point is the CSS reached this root.
        const adopted = (root!.adoptedStyleSheets ?? []).some((s) => s === entry.sheet);
        const injected = !!root!.querySelector(`style[data-mp-light-styles="${entry.key}"]`);
        expect(
          adopted || injected,
          `${tag}: light-tier sheet "${entry.key}" never reached its shadow root — a nested ` +
            `light-DOM component will render unstyled. Call adoptLightStyles(this.renderRoot).`,
        ).toBe(true);
      }

      host.remove();
    });
  }

  it('light-tier elements attach no shadow root of their own', async () => {
    for (const tag of LIGHT_TIER_TAGS) {
      const el = document.createElement(tag) as HTMLElement & {
        updateComplete?: Promise<unknown>;
      };
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.shadowRoot, `${tag}: expected light DOM, found a shadow root`).toBeNull();
      el.remove();
    }
  });
});
