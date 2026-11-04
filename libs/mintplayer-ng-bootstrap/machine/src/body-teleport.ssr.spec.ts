import { ApplicationRef, Component, destroyPlatform, signal } from '@angular/core';
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { MpBodyTeleportDirective } from './body-teleport.directive';

/**
 * #458 M2, the opening risk of PRD §4.4 (S5): an overlay rendered into a body
 * host as a DETACHED view must server-render at the end of <body> and hydrate
 * without a mismatch: the component's own nodes are hydrated (kept), the
 * overlay is replaced by the client's copy (one host, not two), and it still
 * follows the component's state.
 *
 * `renderApplication` needs the server platform and hydration the browser one,
 * so each step tears the previous platform down (vitest isolates files).
 */
const SHELL = '<html><head></head><body><mp-overlay-host></mp-overlay-host></body></html>';

@Component({
  selector: 'mp-overlay-host',
  imports: [MpBodyTeleportDirective],
  template: `
    <div class="clip" data-bs-theme="dark" dir="rtl">
      <p id="inline">{{ text() }}</p>
      @if (open()) {
        <ng-template mpBodyTeleport><div id="overlay">{{ text() }}</div></ng-template>
      }
    </div>
  `,
})
class OverlayHostComponent {
  readonly open = signal(true);
  readonly text = signal('hello');
}

const hosts = () => [...document.querySelectorAll('[data-mp-overlay]')];

describe('MpBodyTeleportDirective across a server render and hydration (#458 S5)', () => {
  beforeAll(() => destroyPlatform());
  afterEach(() => destroyPlatform());

  it('server-renders the overlay into a body host, and the client replaces it without a hydration mismatch', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(OverlayHostComponent, { providers: [provideServerRendering(), provideClientHydration()] }, context),
      { document: SHELL, url: '/' },
    );
    destroyPlatform();
    // The host is a direct child of <body>, after the app root, and carries the inherited state.
    expect(html).toMatch(/<\/mp-overlay-host>\s*<div data-mp-overlay="mp-overlay-[^"]+" data-bs-theme="dark" dir="rtl"><div id="overlay">hello<\/div><\/div>/);

    document.open();
    document.write(html);
    document.close();
    const serverInline = document.getElementById('inline');
    const serverOverlay = document.getElementById('overlay');
    const errors = vi.spyOn(console, 'error');
    const warnings = vi.spyOn(console, 'warn');

    const app = await bootstrapApplication(OverlayHostComponent, { providers: [provideClientHydration()] });
    const appRef = app.injector.get(ApplicationRef);
    await appRef.whenStable();

    // Hydrated, not re-rendered: the component's own node is the server's.
    expect(document.getElementById('inline')).toBe(serverInline);
    // The overlay is the client's: one host, same id, new nodes.
    expect(hosts()).toHaveLength(1);
    expect(document.getElementById('overlay')).not.toBe(serverOverlay);
    expect(document.getElementById('overlay')?.textContent).toBe('hello');
    const messages = [...errors.mock.calls, ...warnings.mock.calls].map((call) => String(call[0]));
    expect(messages.filter((m) => /NG0?5\d\d|hydration/i.test(m))).toEqual([]);

    // It follows the component's state, and closes with it.
    const host = app.components[0].instance as OverlayHostComponent;
    host.text.set('world');
    await appRef.whenStable();
    expect(document.getElementById('overlay')?.textContent).toBe('world');
    host.open.set(false);
    await appRef.whenStable();
    expect(hosts()).toHaveLength(0);
    host.open.set(true);
    await appRef.whenStable();
    expect(hosts()).toHaveLength(1);
    expect(document.getElementById('overlay')?.textContent).toBe('world');

    errors.mockRestore();
    warnings.mockRestore();
    app.destroy();
    expect(hosts()).toHaveLength(0);
  });
});
