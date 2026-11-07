import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsModalComponent } from './generated/modal.component.generated';
import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';

/**
 * #465 M5 O1/O7: an overlay's consumer content is created on the first open and
 * kept across close → reopen (its own state survives); destroying the owner
 * removes the content and its body host. Modal (`mpBodyTeleport`) and tooltip
 * (`useOverlayComponent`) cover the two Angular overlay paths.
 */
let constructed = 0;

@Component({
  selector: 'probe-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" class="probe" [attr.data-bumps]="bumps()" (click)="bumps.set(bumps() + 1)">probe</button>`,
})
class ProbeComponent {
  readonly bumps = signal(0);
  constructor() {
    constructed++;
  }
}

@Component({
  selector: 'bs-overlay-keep-alive-host',
  imports: [BsModalComponent, BsTooltipDirective, ProbeComponent],
  template: `@if (alive()) {
    <bs-modal [open]="modalOpen()"><probe-content /></bs-modal>
    <button type="button" class="trigger">trigger<span *bsTooltip><probe-content /></span></button>
  }`,
})
class HostComponent {
  readonly alive = signal(true);
  readonly modalOpen = signal(false);
}

const probes = () => Array.from(document.body.querySelectorAll<HTMLElement>('.probe'));

describe('Angular overlay keep-alive (#465)', () => {
  const setup = () => {
    constructed = 0;
    const fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement);
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, settle };
  };

  afterEach(() => {
    document.body.querySelectorAll('[data-mp-overlay]').forEach((el) => el.remove());
  });

  it('O1/O7: a modal keeps its content across close and reopen, and removes it with the owner', async () => {
    const { fixture, settle } = setup();
    const host = fixture.componentInstance;
    await settle();
    host.modalOpen.set(true);
    await settle();
    const first = probes()[0];
    expect(first).toBeDefined();
    first.click();
    host.modalOpen.set(false);
    await settle();
    expect(probes()[0]).toBe(first);
    expect(first.closest('.modal')?.hasAttribute('hidden')).toBe(true);
    host.modalOpen.set(true);
    await settle();
    expect(probes()[0]).toBe(first);
    expect(first.getAttribute('data-bumps')).toBe('1');
    expect(constructed).toBe(1);
    host.alive.set(false);
    await settle();
    expect(probes()).toEqual([]);
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
    fixture.destroy();
  });

  it('O1/O7: a tooltip keeps its content across hide and show, and removes it with the trigger', async () => {
    const { fixture, settle } = setup();
    await settle();
    const trigger = document.body.querySelector<HTMLElement>('.trigger')!;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    const first = probes()[0];
    expect(first).toBeDefined();
    // The modal's projected probe is constructed eagerly (Angular creates <ng-content> once), so count from here.
    const before = constructed;
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();
    expect(probes()[0]).toBe(first);
    await vi.waitFor(() => expect(first.closest('.tooltip')?.hasAttribute('hidden')).toBe(true));
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(probes()[0]).toBe(first);
    expect(constructed).toBe(before);
    fixture.componentInstance.alive.set(false);
    await settle();
    expect(probes()).toEqual([]);
    expect(document.body.querySelector('[data-mp-overlay]')).toBeNull();
    fixture.destroy();
  });
});
