import { Component, destroyPlatform, inject, PendingTasks, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { defineCore } from '@mintplayer/ui-core/component';
import { useCore } from './core';

/**
 * #449 review: the server prefetch must start with the first inputs that name
 * one, not be spent on the first delivery. The shape: a `fetch`-like input the
 * consumer sets only after an async step of its own (held by a pending task),
 * so the first inputs have no transfer key.
 *
 * `renderApplication` needs the server platform; the test environment created
 * the browser-testing one, so this file tears it down first (vitest isolates files).
 */
interface Inputs {
  readonly source: string | null;
}
interface State {
  readonly rows: readonly string[] | null;
}

const lateCore = defineCore<Inputs, State, { text: string }>({
  state: (_inputs, seed) => ({ rows: (seed as { rows?: string[] } | undefined)?.rows ?? null }),
  transferKey: (inputs) => (inputs.source ? `late:${inputs.source}` : undefined),
  prefetch: (inputs) => (inputs.source ? Promise.resolve({ rows: [`${inputs.source}-1`, `${inputs.source}-2`] }) : undefined),
  adopt: (state, inputs, seed) => (inputs.source ? { rows: (seed as { rows: string[] }).rows } : state),
  view: ({ state }) => ({ text: state.rows ? state.rows.join(',') : 'Loading' }),
});

@Component({
  selector: 'bs-late-table',
  template: `<p id="late">{{ core.props().text }}</p>`,
})
class LateTableComponent {
  readonly source = signal<string | null>(null);
  readonly core = useCore(lateCore, { inputs: () => ({ source: this.source() }), idPrefix: 'bs-late' });

  constructor() {
    // The consumer's own async step (loading metadata), completed before serialization.
    void inject(PendingTasks).run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.source.set('customers');
    });
  }
}

describe('useCore server prefetch with late inputs (#449 review)', () => {
  beforeAll(() => destroyPlatform());

  it('prefetches once the inputs name a key, and transfers the seed', async () => {
    const html = await renderApplication(
      (context) => bootstrapApplication(LateTableComponent, { providers: [provideServerRendering()] }, context),
      { document: '<html><head></head><body><bs-late-table></bs-late-table></body></html>', url: '/' },
    );
    expect(/<p id="late">([^<]*)<\/p>/.exec(html)?.[1]).toBe('customers-1,customers-2');
    expect(html).toContain('late:customers');
  });
});
