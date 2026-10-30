import { Component, makeStateKey, signal, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineCore } from '@mintplayer/ui-core/component';
import { useCore } from './core';

/**
 * #449 review, client half: a transferred seed whose key the first inputs do
 * not name (the consumer sets its `fetch` after an async step) is read when
 * the key arrives and applied through `adopt`, instead of being left unread
 * while the component fetches what the server already sent.
 */
interface Inputs {
  readonly source: string | null;
}
interface State {
  readonly rows: readonly string[] | null;
}

const adopted: string[] = [];
const lateCore = defineCore<Inputs, State, { text: string }>({
  state: (_inputs, seed) => ({ rows: (seed as { rows?: string[] } | undefined)?.rows ?? null }),
  transferKey: (inputs) => (inputs.source ? `late:${inputs.source}` : undefined),
  adopt: (state, inputs, seed) => {
    adopted.push(String(inputs.source));
    return { ...state, rows: (seed as { rows: string[] }).rows };
  },
  view: ({ state }) => ({ text: state.rows ? state.rows.join(',') : 'Loading' }),
});

@Component({
  selector: 'bs-late-table',
  template: `<p>{{ core.props().text }}</p>`,
})
class LateTableComponent {
  readonly source = signal<string | null>(null);
  readonly core = useCore(lateCore, { inputs: () => ({ source: this.source() }), idPrefix: 'bs-late' });
}

describe('useCore transferred seed with late inputs (#449 review)', () => {
  it('adopts the seed once the inputs name its key, and reads it only once', async () => {
    const transfer = TestBed.inject(TransferState);
    transfer.set(makeStateKey<unknown>('late:customers'), { rows: ['customers-1', 'customers-2'] });
    const fixture = TestBed.createComponent(LateTableComponent);
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const text = () => (fixture.nativeElement as HTMLElement).querySelector('p')?.textContent;
    await settle();
    expect(text()).toBe('Loading');

    fixture.componentInstance.source.set('customers');
    await settle();
    expect(text()).toBe('customers-1,customers-2');
    expect(adopted).toEqual(['customers']);
    expect(transfer.hasKey(makeStateKey<unknown>('late:customers'))).toBe(false);

    // Another delivery does not read again.
    fixture.componentInstance.source.set('orders');
    await settle();
    expect(adopted).toEqual(['customers']);
  });
});
