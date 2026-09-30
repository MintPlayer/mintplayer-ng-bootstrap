import { Component, Directive, inject, Injector, signal, TemplateRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsModalHostComponent, MODAL_LEAVE_MS } from './modal-host.component';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { MockComponent, MockDirective, MockProvider } from 'ng-mocks';
import { BsModalComponent } from '../modal/modal.component';
import { BsModalDirective } from '../../directives/modal/modal.directive';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

@Component({
  selector: 'bs-modal-test',
  template: `
    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader><h5>Title</h5></div>
        <div bsModalBody>Content</div>
        <div bsModalFooter>Footer</div>
      </div>
    </bs-modal>`,
  imports: [
    MockComponent(BsModalHostComponent),
  ],
})
class BsModalTestComponent {
  isOpen = false;
}

describe('BsModalHostComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  const modalMockType = MockComponent(BsModalComponent);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        MockComponent(BsHasOverlayComponent),
        NoopAnimationsModule,
        // Unit to test
        BsModalHostComponent,

        // Mock dependencies
        modalMockType,
        MockDirective(BsModalDirective),

        // Testbench
        BsModalTestComponent
      ],
      providers: [
        {
          provide: PORTAL_FACTORY,
          useValue: (injector: Injector) => {
            return new ComponentPortal(modalMockType, null, injector);
          }
        }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

/** Stands in for the modal content: records what the host writes to it. */
@Component({
  selector: 'bs-modal-content',
  imports: [NgTemplateOutlet],
  template: `<div class="stand-in"><ng-container *ngTemplateOutlet="template"></ng-container></div>`,
})
class ModalStandInComponent {
  template = inject(MODAL_CONTENT);
  isOpen = signal(false);
  scrollable = signal(false);
}

@Component({
  selector: 'bs-modal-signal-host',
  imports: [BsModalHostComponent, BsModalDirective],
  template: `
    @if (mounted()) {
      <bs-modal [(isOpen)]="open" [scrollable]="scrollable()" [closeOnEscape]="closeOnEscape()">
        <div *bsModal class="projected">Body</div>
      </bs-modal>
    }`,
})
class SignalHostComponent {
  readonly mounted = signal(true);
  readonly open = signal(false);
  readonly scrollable = signal(false);
  readonly closeOnEscape = signal(true);
}

describe('BsModalHostComponent behaviour', () => {
  let fixture: ComponentFixture<SignalHostComponent>;
  const host = () => fixture.debugElement.query(By.directive(BsModalHostComponent)).componentInstance as BsModalHostComponent;
  const modal = () => host().componentInstance!.instance as unknown as ModalStandInComponent;
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
  const settle = () => { fixture.detectChanges(); TestBed.tick(); };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule],
      providers: [{
        provide: PORTAL_FACTORY,
        useValue: (injector: Injector) => new ComponentPortal(ModalStandInComponent, null, injector),
      }],
    });
    TestBed.overrideComponent(BsModalHostComponent, {
      set: { imports: [MockComponent(BsHasOverlayComponent)], providers: [] },
    });
    fixture = TestBed.createComponent(SignalHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('renders the *bsModal template inside the overlay and forwards isOpen and scrollable', () => {
    expect(host().overlayRef.overlayElement.querySelector('.projected')?.textContent).toBe('Body');
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.scrollable.set(true);
    settle();
    expect(modal().isOpen()).toBe(true);
    expect(modal().scrollable()).toBe(true);
  });

  it('Escape closes the open modal when it is the top overlay', () => {
    fixture.componentInstance.open.set(true);
    settle();
    const stack = TestBed.inject(BsOverlayStackService);
    const above = stack.push();
    escape();
    expect(fixture.componentInstance.open()).toBe(true);
    stack.release(above);
    escape();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('Escape does nothing with closeOnEscape off, or for another key', () => {
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.closeOnEscape.set(false);
    settle();
    escape();
    expect(fixture.componentInstance.open()).toBe(true);
    fixture.componentInstance.closeOnEscape.set(true);
    settle();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('holds an overlay-stack entry only while open', () => {
    const stack = TestBed.inject(BsOverlayStackService);
    const push = vi.spyOn(stack, 'push');
    const release = vi.spyOn(stack, 'release');
    fixture.componentInstance.open.set(true);
    settle();
    fixture.componentInstance.open.set(false);
    settle();
    expect(push).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(push.mock.results[0].value);
  });

  it('on destroy, closes the modal and releases its stack entry, then disposes after the leave animation', () => {
    vi.useFakeTimers();
    fixture.componentInstance.open.set(true);
    settle();
    const stack = TestBed.inject(BsOverlayStackService);
    const release = vi.spyOn(stack, 'release');
    const m = modal();
    const dispose = vi.spyOn(host().overlayRef, 'dispose');
    fixture.componentInstance.mounted.set(false);
    settle();
    expect(m.isOpen()).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MODAL_LEAVE_MS);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes at once when the app is torn down before the leave animation ends', () => {
    vi.useFakeTimers();
    const dispose = vi.spyOn(host().overlayRef, 'dispose');
    fixture.componentInstance.mounted.set(false);
    settle();
    TestBed.resetTestingModule();
    expect(dispose).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(MODAL_LEAVE_MS * 10);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
