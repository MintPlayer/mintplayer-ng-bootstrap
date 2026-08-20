/**
 * The published entrypoint's surface. `@mintplayer/web-components/dock` is what
 * every framework wrapper imports, so a re-export dropped from any barrel in the
 * chain is a consumer-visible break that nothing else in this suite would catch —
 * the component specs all import the element by its concrete path.
 *
 * Asserting the shape here rather than merely importing it is deliberate: an
 * import alone would move the same coverage lines while proving nothing.
 */
import { describe, expect, it } from 'vitest';

import * as dockEntrypoint from '../index';
import { MintDockManagerElement } from '../index';

describe('@mintplayer/web-components/dock entrypoint', () => {
  it('exports the element class', () => {
    expect(MintDockManagerElement).toBeTypeOf('function');
    expect(MintDockManagerElement.prototype).toBeInstanceOf(HTMLElement);
  });

  it('registers the custom element as a side effect of importing the barrel', () => {
    // The element file calls customElements.define at the bottom; the barrel is
    // the only thing a consumer imports, so the registration has to survive it.
    expect(customElements.get('mint-dock-manager')).toBe(MintDockManagerElement);
  });

  it('re-exports the layout types module without leaking runtime values', () => {
    // types/dock-layout.ts is type-only, so the barrel must contribute exactly
    // one runtime binding. A stray runtime export here means a type was
    // accidentally given a value declaration.
    expect(Object.keys(dockEntrypoint)).toEqual(['MintDockManagerElement']);
  });
});
