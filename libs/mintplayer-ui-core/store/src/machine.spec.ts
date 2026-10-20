import { Machine } from './machine';

interface CounterState {
  count: number;
  label: string;
}

class CounterMachine extends Machine<CounterState> {
  constructor() {
    super({ count: 0, label: 'zero' });
  }
  increment(): void {
    this.update((s) => ({ count: s.count + 1 }));
  }
  relabel(label: string): void {
    this.update({ label });
  }
  /** Two keys in one command: must notify once. */
  incrementAndRelabel(label: string): void {
    this.batch(() => {
      this.increment();
      this.relabel(label);
    });
  }
  noop(): void {
    this.update({ count: this.snapshot.count });
  }
}

describe('Machine', () => {
  let machine: CounterMachine;
  let seen: CounterState[];

  beforeEach(() => {
    machine = new CounterMachine();
    seen = [];
    machine.subscribe((s) => seen.push(s));
  });

  it('replaces the snapshot with a new object and notifies once per update', () => {
    const before = machine.snapshot;
    machine.increment();
    expect(machine.snapshot).not.toBe(before);
    expect(machine.snapshot).toEqual({ count: 1, label: 'zero' });
    expect(seen).toHaveLength(1);
  });

  it('skips notification when nothing changed', () => {
    machine.noop();
    expect(seen).toHaveLength(0);
  });

  it('batches nested updates into one notification', () => {
    machine.incrementAndRelabel('one');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ count: 1, label: 'one' });
  });

  it('flushes a batch even when a nested command throws', () => {
    expect(() =>
      (machine as unknown as { batch(fn: () => void): void }).batch(() => {
        machine.increment();
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(seen).toHaveLength(1);
  });

  it('unsubscribe stops delivery, also when called during a notification', () => {
    const off = machine.subscribe(() => off());
    machine.increment();
    machine.increment();
    expect(seen).toHaveLength(2);
  });

  it('destroy clears subscribers and refuses further updates', () => {
    machine.destroy();
    machine.increment();
    expect(seen).toHaveLength(0);
    expect(machine.snapshot.count).toBe(0);
    expect(machine.destroyed).toBe(true);
  });
});
