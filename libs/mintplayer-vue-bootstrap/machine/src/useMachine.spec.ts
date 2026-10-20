import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { Machine } from '@mintplayer/ui-core/store';
import { useMachine } from './useMachine';

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

describe('useMachine (spike S1: Vue bridge)', () => {
  function setup() {
    let renders = 0;
    let machine!: CounterMachine;
    const Host = defineComponent({
      setup() {
        const [m, state] = useMachine(() => new CounterMachine());
        machine = m;
        return () => {
          renders += 1;
          return h('span', `${state.value.count}:${state.value.label}`);
        };
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    return { wrapper, get renders() { return renders; }, get machine() { return machine; } };
  }

  it('renders once per committed snapshot, including a batched multi-key command', async () => {
    const t = setup();
    const initial = t.renders;
    expect(t.wrapper.text()).toBe('0:zero');

    t.machine.increment();
    await nextTick();
    expect(t.wrapper.text()).toBe('1:zero');
    expect(t.renders).toBe(initial + 1);

    t.machine.incrementAndRelabel('two');
    await nextTick();
    expect(t.wrapper.text()).toBe('2:two');
    expect(t.renders).toBe(initial + 2);
    t.wrapper.unmount();
  });

  it('coalesces two commands in one tick into one render', async () => {
    const t = setup();
    const initial = t.renders;
    t.machine.increment();
    t.machine.increment();
    await nextTick();
    expect(t.wrapper.text()).toBe('2:zero');
    expect(t.renders).toBe(initial + 1);
    t.wrapper.unmount();
  });

  it('destroys the machine on unmount', () => {
    const t = setup();
    const machine = t.machine;
    t.wrapper.unmount();
    expect(machine.destroyed).toBe(true);
  });
});
