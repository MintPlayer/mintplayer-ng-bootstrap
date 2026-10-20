import { Component, destroyPlatform } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { BsTypeaheadComponent } from './typeahead.component';

/**
 * D15: Angular SSR emits a real, named, labelled combobox input that submits
 * free text with JavaScript disabled, plus the scoped stylesheet in <head>,
 * with no custom element in the way. Compare: the previous web-component
 * design would have emitted an empty element here.
 */
@Component({
  selector: 'bs-typeahead-ssr-root',
  imports: [BsTypeaheadComponent],
  template: `<form method="get"><bs-typeahead name="q" inputLabel="Street" [value]="'kru'" [provider]="null"></bs-typeahead></form>`,
})
class RootComponent {}

describe('BsTypeaheadComponent under Angular SSR', () => {
  beforeAll(() => destroyPlatform());

  it('renders the named input with its ARIA and value, a hidden listbox, and the scoped sheet in <head>', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(RootComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-typeahead-ssr-root></bs-typeahead-ssr-root></body></html>', url: '/' },
    );
    const input = /<input[^>]*>/.exec(html)?.[0] ?? '';
    expect(input).toContain('role="combobox"');
    expect(input).toContain('name="q"');
    expect(input).toContain('value="kru"');
    expect(input).toContain('aria-label="Street"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).toContain('data-mps="typeahead"');
    expect(input).not.toContain('aria-activedescendant');
    expect(html).toMatch(/<ul[^>]*role="listbox"[^>]*hidden/);
    expect(html).toContain('<style data-mp-light-styles="typeahead">');
    expect((html.match(/data-mp-light-styles="typeahead"/g) ?? []).length).toBe(1);
  });
});
