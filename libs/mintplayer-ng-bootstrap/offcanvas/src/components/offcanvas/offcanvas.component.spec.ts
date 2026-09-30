import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ComponentRef, inject, Injector, PLATFORM_ID, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { BsOffcanvasComponent, OFFCANVAS_TRANSITION_MS } from './offcanvas.component';

@Component({
  selector: 'offcanvas-test-component',
  template: `<ng-template #offcanvasTemplate><div class="content">Notifications</div></ng-template>`,
})
class OffcanvasTestComponent {
  private overlay = inject(Overlay);
  private parentInjector = inject(Injector);
  readonly offcanvasTemplate = viewChild.required<TemplateRef<unknown>>('offcanvasTemplate');

  generateOffcanvas(): ComponentRef<BsOffcanvasComponent> {
    const injector = Injector.create({
      providers: [{ provide: OFFCANVAS_CONTENT, useValue: this.offcanvasTemplate() }],
      parent: this.parentInjector,
    });
    return this.overlay.create({}).attach(new ComponentPortal(BsOffcanvasComponent, null, injector));
  }
}

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    imports: [OverlayModule, OffcanvasTestComponent],
    providers: [provideNoopAnimations(), { provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(OffcanvasTestComponent);
  fixture.detectChanges();
  const ref = fixture.componentInstance.generateOffcanvas();
  const settle = () => { TestBed.tick(); ref.changeDetectorRef.detectChanges(); };
  settle();
  const panel = () => (ref.location.nativeElement as HTMLElement).querySelector('.offcanvas') as HTMLElement;
  return { ref, panel, settle };
}

describe('BsOffcanvasComponent', () => {
  let raf: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    // Run animation frames synchronously: the panel's show sequence is two nested frames.
    raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => { cb(0); return 0; });
  });
  afterEach(() => {
    raf.mockRestore();
    vi.useRealTimers();
  });

  it('renders the content template inside a dialog', () => {
    const { panel } = setup();
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().querySelector('.content')?.textContent).toBe('Notifications');
  });

  it('shows by making the panel visible first and adding .show on a later frame', () => {
    const { ref, panel, settle } = setup();
    ref.instance.isVisible.set(true);
    settle();
    expect(ref.instance.visibility()).toBe('visible');
    expect(ref.instance.show()).toBe(true);
    expect(panel().classList).toContain('show');
  });

  it('hides by dropping .show at once and the visibility after the transition', () => {
    const { ref, settle } = setup();
    ref.instance.isVisible.set(true);
    settle();
    ref.instance.isVisible.set(false);
    settle();
    expect(ref.instance.show()).toBe(false);
    expect(ref.instance.visibility()).toBe('visible');
    vi.advanceTimersByTime(OFFCANVAS_TRANSITION_MS);
    expect(ref.instance.visibility()).toBe('hidden');
  });

  it('a re-show during the hide transition keeps the panel visible', () => {
    const { ref, settle } = setup();
    ref.instance.isVisible.set(true);
    settle();
    ref.instance.isVisible.set(false);
    settle();
    ref.instance.isVisible.set(true);
    settle();
    vi.advanceTimersByTime(OFFCANVAS_TRANSITION_MS);
    expect(ref.instance.visibility()).toBe('visible');
  });

  it.each([
    ['start', 250, null, 'overflow-x-hidden'],
    ['end', 250, null, 'overflow-x-hidden'],
    ['top', null, 250, 'overflow-y-hidden'],
    ['bottom', null, 250, 'overflow-y-hidden'],
  ] as const)('position %s sizes the %s axis and hides overflow across it', (position, width, height, overflow) => {
    const { ref, panel, settle } = setup();
    ref.instance.position.set(position);
    ref.instance.size.set(250);
    settle();
    expect(ref.instance.width()).toBe(width);
    expect(ref.instance.height()).toBe(height);
    expect(panel().classList).toContain(`offcanvas-${position}`);
    expect(panel().classList).toContain(overflow);
  });

  it('suspends the transition while the position changes, and restores it on the next frame', () => {
    const { ref, settle } = setup();
    raf.mockImplementation(() => 0);
    ref.instance.position.set('top');
    settle();
    expect(ref.instance.disableTransition()).toBe(true);
    raf.mock.calls[raf.mock.calls.length - 1][0](0);
    expect(ref.instance.disableTransition()).toBe(false);
  });

  it('shows a backdrop only while visible with hasBackdrop, and marks the dialog modal', () => {
    const { ref, panel, settle } = setup();
    ref.instance.hasBackdrop.set(true);
    settle();
    expect(ref.instance.showBackdrop()).toBe(false);
    expect(panel().getAttribute('aria-modal')).toBe('true');
    ref.instance.isVisible.set(true);
    settle();
    expect(ref.instance.showBackdrop()).toBe(true);
  });

  it('emits backdropClick when the backdrop is clicked', () => {
    const { ref, settle } = setup();
    ref.instance.hasBackdrop.set(true);
    ref.instance.isVisible.set(true);
    settle();
    const clicks: MouseEvent[] = [];
    ref.instance.backdropClick.subscribe((e) => clicks.push(e));
    (ref.location.nativeElement as HTMLElement).querySelector<HTMLElement>('.modal-backdrop')!.click();
    expect(clicks).toHaveLength(1);
  });

  it('Escape closes an open panel and reports it; it does nothing while closed', () => {
    const { ref, settle } = setup();
    const changes: boolean[] = [];
    ref.instance.isVisibleChange.subscribe((v) => changes.push(v));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(changes).toEqual([]);
    ref.instance.isVisible.set(true);
    settle();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(ref.instance.isVisible()).toBe(false);
    expect(changes).toEqual([false]);
  });

  it('on the server, requests no animation frames: .show waits for the browser', () => {
    const { ref, settle } = setup('server');
    raf.mockClear();
    ref.instance.isVisible.set(true);
    ref.instance.position.set('end');
    settle();
    expect(raf).not.toHaveBeenCalled();
    expect(ref.instance.visibility()).toBe('visible');
    expect(ref.instance.show()).toBe(false);
  });
});
