import { Component, destroyPlatform, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { MpPropsDirective, PropBag } from './props.directive';

/**
 * Spike S2 (docs/prd/typeahead-wc-436.md §9), server half: attributes a core's
 * bag produces must be in the server-rendered HTML, because that HTML is what a
 * no-JS visitor and a screen reader get before hydration.
 *
 * `renderApplication` needs the server platform, and the test environment has
 * already created the browser-testing one, so this file tears that down first.
 * vitest isolates spec files, so no other file sees the destroyed platform.
 */
@Component({
  selector: 'bs-s2-root',
  imports: [MpPropsDirective],
  template: `<input id="s2" [mpProps]="bag()" /><ul [mpProps]="{ role: 'listbox', 'aria-busy': 'true', hidden: true }"></ul>`,
})
class RootComponent {
  readonly bag = signal<PropBag>({
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-activedescendant': null,
    name: 'q',
    value: 'kru',
  });
}

describe('MpPropsDirective under Angular SSR (spike S2, server half)', () => {
  beforeAll(() => destroyPlatform());

  it('writes the bag into the server-rendered HTML and omits removed keys', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(RootComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-s2-root></bs-s2-root></body></html>', url: '/' },
    );
    const input = /<input[^>]*>/.exec(html)?.[0] ?? '';
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).toContain('name="q"');
    expect(input).toContain('value="kru"');
    expect(input).not.toContain('aria-activedescendant');
    const list = /<ul[^>]*>/.exec(html)?.[0] ?? '';
    expect(list).toContain('role="listbox"');
    expect(list).toContain('aria-busy="true"');
    expect(list).toMatch(/\shidden(=""|\s|>)/);
  });
});
