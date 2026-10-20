import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, startTransition } from 'react';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Machine } from '@mintplayer/ui-core/store';
import { useMachine } from '../../machine/src/useMachine';

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

let container: HTMLElement;
let root: Root;
let renders = 0;
let machineRef: CounterMachine | undefined;

function Host() {
  const [machine, state] = useMachine(() => new CounterMachine());
  machineRef = machine;
  renders += 1;
  return React.createElement('span', null, `${state.count}:${state.label}`);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  renders = 0;
  machineRef = undefined;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('useMachine (spike S1: React bridge)', () => {
  it('renders once per committed snapshot, including a batched multi-key command', async () => {
    await act(async () => root.render(React.createElement(Host)));
    const initial = renders;
    expect(container.textContent).toBe('0:zero');

    await act(async () => machineRef!.increment());
    expect(container.textContent).toBe('1:zero');
    expect(renders).toBe(initial + 1);

    await act(async () => machineRef!.incrementAndRelabel('two'));
    expect(container.textContent).toBe('2:two');
    expect(renders).toBe(initial + 2);
  });

  it('does not tear under a transition: the committed DOM never shows a mixed snapshot', async () => {
    await act(async () => root.render(React.createElement(Host)));
    await act(async () => {
      startTransition(() => machineRef!.incrementAndRelabel('three'));
    });
    expect(container.textContent).toBe('1:three');
  });

  it('destroys the machine on unmount', async () => {
    await act(async () => root.render(React.createElement(Host)));
    const machine = machineRef!;
    await act(async () => root.unmount());
    expect(machine.destroyed).toBe(true);
    root = createRoot(container); // afterEach unmounts a fresh root
  });
});
