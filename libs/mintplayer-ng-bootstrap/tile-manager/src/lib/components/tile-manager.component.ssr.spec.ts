import { Component, destroyPlatform } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { BsTileManagerComponent } from './tile-manager.component';
import { BsTileContentDirective, BsTileHeaderDirective } from '../directives/tile-template.directives';

/**
 * D14: Angular SSR emits the whole board (a Tier 2 group per tile, its header and content
 * templates) with no inline position, plus two <style>s in <head>: the scoped sheet and the
 * @container rules that place every tile at every column count.
 */
@Component({
  selector: 'bs-tile-manager-ssr-root',
  imports: [BsTileManagerComponent, BsTileHeaderDirective, BsTileContentDirective],
  template: `
    <bs-tile-manager [tiles]="tiles" [stackBelow]="600" label="Dashboard">
      <span *bsTileHeader="let tile">{{ tile.id }} title</span>
      <p *bsTileContent="let tile">{{ tile.id }} body</p>
    </bs-tile-manager>
  `,
})
class RootComponent {
  readonly tiles = [{ id: 'a' }, { id: 'b' }];
}

describe('BsTileManagerComponent under Angular SSR', () => {
  beforeAll(() => destroyPlatform());

  it('renders every tile with its templates, no inline position, and the layout rules in <head>', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(RootComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-tile-manager-ssr-root></bs-tile-manager-ssr-root></body></html>', url: '/' },
    );
    expect(html).not.toContain('<mp-tile-manager');
    expect(html).toMatch(/<div[^>]*class="mp-tile-manager"[^>]*role="region"/);
    expect(html).toContain('aria-label="Dashboard"');
    const tiles = html.match(/<div[^>]*class="tile"[^>]*>/g) ?? [];
    expect(tiles).toHaveLength(2);
    expect(tiles.every((t) => t.includes('role="group"') && !t.includes('tabindex') && !t.includes('grid-column'))).toBe(true);
    expect(html).toContain('a title');
    expect(html).toContain('b body');
    expect(html).not.toContain('tile-grip');
    expect((html.match(/data-mp-light-styles="tile-manager"/g) ?? []).length).toBe(1);
    const layout = /<style data-mp-light-styles="tile-manager-layout-[^"]+">([^<]*)<\/style>/.exec(html)?.[1] ?? '';
    expect(layout).toContain('@container (min-width: 600px)');
    expect(layout).toContain('[data-tile-id="b"]');
  });
});
