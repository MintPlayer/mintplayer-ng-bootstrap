import { NgTemplateOutlet } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, Directive, EventEmitter, inject, Injector, Output, signal, TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { Position } from '@mintplayer/ng-bootstrap';

import { BsOffcanvasHostComponent } from './offcanvas-host.component';
import { OFFCANVAS_TRANSITION_MS } from '../offcanvas/offcanvas.component';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

/** Stands in for the panel: records what the host writes to it. */
@Component({
  selector: 'bs-offcanvas-holder',
  imports: [NgTemplateOutlet],
  template: `<div class="holder"><ng-container *ngTemplateOutlet="contentTemplate"></ng-container></div>`,
})
class BsOffcanvasMockComponent {
  contentTemplate = inject(OFFCANVAS_CONTENT);
  @Output() backdropClick = new EventEmitter<MouseEvent>();
  isVisible = signal<boolean>(false);
  position = signal<Position>('bottom');
  size = signal<number | null>(null);
  hasBackdrop = signal<boolean>(false);
}

@Directive({ selector: '[bsOffcanvasContent]' })
class BsOffcanvasContentMockDirective {
  constructor() {
    inject(BsOffcanvasHostComponent).content = inject(TemplateRef);
  }
}

@Component({
  selector: 'bs-offcanvas-test',
  imports: [BsOffcanvasHostComponent, BsOffcanvasContentMockDirective],
  template: `
    @if (mounted()) {
      <bs-offcanvas [(isVisible)]="visible" [position]="position()" [size]="size()" [hasBackdrop]="backdrop()" (backdropClick)="onBackdrop($event)">
        <span *bsOffcanvasContent class="projected">Content</span>
      </bs-offcanvas>
    }`,
})
class HostComponent {
  readonly mounted = signal(true);
  readonly visible = signal(false);
  readonly position = signal<Position>('start');
  readonly size = signal<number | null>(null);
  readonly backdrop = signal(true);
  readonly backdropClicks: MouseEvent[] = [];
  onBackdrop(e: MouseEvent) { this.backdropClicks.push(e); }
}

function setup() {
  TestBed.configureTestingModule({
    imports: [OverlayModule, HostComponent],
    providers: [{
      provide: PORTAL_FACTORY,
      useValue: (injector: Injector) => new ComponentPortal(BsOffcanvasMockComponent, null, injector),
    }],
  });
  TestBed.overrideComponent(BsOffcanvasHostComponent, {
    set: { imports: [MockComponent(BsHasOverlayComponent)], providers: [] },
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = () => fixture.debugElement.children[0]?.componentInstance as BsOffcanvasHostComponent;
  const panel = () => host().component.instance as unknown as BsOffcanvasMockComponent;
  const settle = () => { fixture.detectChanges(); TestBed.tick(); };
  return { fixture, host, panel, settle };
}

describe('BsOffcanvasHostComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('attaches the panel to an overlay with the projected content, initialised from the inputs', () => {
    const { host, panel } = setup();
    expect(host().overlayRef.hasAttached()).toBe(true);
    expect(host().overlayRef.overlayElement.querySelector('.projected')?.textContent).toBe('Content');
    expect(panel().position()).toBe('start');
    expect(panel().hasBackdrop()).toBe(true);
    expect(panel().isVisible()).toBe(false);
  });

  it('forwards visibility, position, size and backdrop changes to the panel', () => {
    const { fixture, panel, settle } = setup();
    const h = fixture.componentInstance;
    h.visible.set(true);
    h.position.set('top');
    h.size.set(320);
    h.backdrop.set(false);
    settle();
    expect(panel().isVisible()).toBe(true);
    expect(panel().position()).toBe('top');
    expect(panel().size()).toBe(320);
    expect(panel().hasBackdrop()).toBe(false);
  });

  it('re-emits the panel\'s backdrop clicks', () => {
    const { fixture, panel } = setup();
    const ev = new MouseEvent('click');
    panel().backdropClick.emit(ev);
    expect(fixture.componentInstance.backdropClicks).toEqual([ev]);
  });

  it('on destroy, hides the panel first and disposes the overlay after the hide transition', () => {
    vi.useFakeTimers();
    const { fixture, host, panel, settle } = setup();
    fixture.componentInstance.visible.set(true);
    settle();
    const overlayRef = host().overlayRef;
    const p = panel();
    const dispose = vi.spyOn(overlayRef, 'dispose');

    fixture.componentInstance.mounted.set(false);
    settle();
    // written straight to the panel: the host's sync effects are already gone
    expect(p.isVisible()).toBe(false);
    expect(dispose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OFFCANVAS_TRANSITION_MS);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes at once, and never again, when the app is torn down during the hide transition', () => {
    vi.useFakeTimers();
    const { fixture, host, settle } = setup();
    const overlayRef = host().overlayRef;
    const dispose = vi.spyOn(overlayRef, 'dispose');
    fixture.componentInstance.mounted.set(false);
    settle();

    // tears the root environment (and with it the ApplicationRef) down
    TestBed.resetTestingModule();
    expect(dispose).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(OFFCANVAS_TRANSITION_MS * 10);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
