import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Machine } from '@mintplayer/ui-core/store';
import { machineSignal } from './machine-signal';

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

@Component({
  selector: 'bs-s1-host',
  template: `<span>{{ trace() }}{{ state().count }}:{{ state().label }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly machine = new CounterMachine();
  readonly state = machineSignal(this.machine);
  readonly doubled = computed(() => this.state().count * 2);
  renders = 0;
  /** Called from the template: counts template executions. */
  trace(): string {
    this.renders += 1;
    return '';
  }
}

describe('machineSignal (spike S1: Angular bridge)', () => {
  it('renders once per committed snapshot, under zoneless change detection', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    await fixture.whenStable();
    const initial = host.renders;
    expect(fixture.nativeElement.textContent).toBe('0:zero');

    host.machine.increment();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe('1:zero');
    expect(host.renders).toBe(initial + 1);

    host.machine.incrementAndRelabel('two');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe('2:two');
    expect(host.renders).toBe(initial + 2);
    expect(host.doubled()).toBe(4);
  });

  it('unsubscribes when the injection context is destroyed', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.destroy();
    const before = host.state();
    host.machine.increment();
    expect(host.state()).toBe(before);
  });
});
