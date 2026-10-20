import { html, LitElement } from 'lit';
import { Machine } from '@mintplayer/ui-core/store';
import { MachineController } from './machine-controller';

/** Spike S1 fixture: the real `Machine` contract, nothing typeahead-specific. */
class CounterMachine extends Machine<{ count: number; label: string }> {
  constructor() {
    super({ count: 0, label: 'zero' });
  }
  increment() {
    this.update((s) => ({ count: s.count + 1 }));
  }
  incrementAndRelabel(label: string) {
    this.batch(() => {
      this.increment();
      this.update({ label });
    });
  }
}

class S1Element extends LitElement {
  readonly ctl = new MachineController<CounterMachine, { count: number; label: string }>(this, new CounterMachine());
  renders = 0;
  override render() {
    this.renders += 1;
    const s = this.ctl.state;
    return html`<span>${s.count}:${s.label}</span>`;
  }
}
customElements.define('s1-machine-element', S1Element);

describe('MachineController (spike S1: Lit bridge)', () => {
  let el: S1Element;
  beforeEach(async () => {
    el = document.createElement('s1-machine-element') as S1Element;
    document.body.appendChild(el);
    await el.updateComplete;
  });
  afterEach(() => el.remove());

  const text = () => el.shadowRoot!.textContent;

  it('renders once per committed snapshot, including a batched multi-key command', async () => {
    const initial = el.renders;
    expect(text()).toBe('0:zero');
    el.ctl.machine.increment();
    await el.updateComplete;
    expect(text()).toBe('1:zero');
    expect(el.renders).toBe(initial + 1);
    el.ctl.machine.incrementAndRelabel('two');
    await el.updateComplete;
    expect(text()).toBe('2:two');
    expect(el.renders).toBe(initial + 2);
  });

  it('stops listening while disconnected and catches up on reconnect', async () => {
    el.remove();
    el.ctl.machine.increment();
    expect(el.ctl.state.count).toBe(1);
    document.body.appendChild(el);
    await el.updateComplete;
    expect(text()).toBe('1:zero');
  });

  it('dispose destroys an owned machine', () => {
    el.ctl.dispose();
    expect(el.ctl.machine.destroyed).toBe(true);
  });
});
