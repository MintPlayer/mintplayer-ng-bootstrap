import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Injector, signal, TemplateRef, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsPopoverDirective } from './popover.directive';
import { MockComponent } from 'ng-mocks';
import { BsPopoverComponent } from '../../component/popover.component';

import type { Position } from '@mintplayer/ng-bootstrap';

enum PositionEnum { top, left, bottom, right }

@Component({
  selector: 'bs-Popover-directive-test',
  imports: [BsPopoverDirective],
  template: `
    <button #button>
      Bottom
      <ng-container *bsPopover="popoverPosition.bottom">
        <h3 bsPopoverHeader>Popover title</h3>
        <div bsPopoverBody>
          And here's some amazing content. It's very engaging. Right?
          <input type="checkbox">
        </div>
      </ng-container>
    </button>`,
})
class BsPopoverDirectiveTestComponent {
  @ViewChild('popoverTemplate') popoverTemplate!: TemplateRef<any>;
  @ViewChild('button') button!: ElementRef<HTMLButtonElement>;
  popoverPosition = PositionEnum;
}

describe('BsPopoverDirective', () => {
  let component: BsPopoverDirectiveTestComponent;
  let fixture: ComponentFixture<BsPopoverDirectiveTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
        // Unit to test
        BsPopoverDirective,

        // Mock dependencies
        MockComponent(BsPopoverComponent),

        // Testbench
        BsPopoverDirectiveTestComponent,
      ],
      providers: [
        provideNoopAnimations(),
        {
          provide: PORTAL_FACTORY,
          useValue: (injector: Injector) => {
            return new ComponentPortal(MockComponent(BsPopoverComponent), null, injector);
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsPopoverDirectiveTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show and hide the popover', async () => {
    await fixture.whenStable();
    const button = component.button.nativeElement;

    const h3Count1 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    expect(h3Count1.length).toBe(0);

    button.click();
    fixture.detectChanges();

    // const h3Count2 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    // expect(h3Count2.length).toBe(1);

    button.click();
    fixture.detectChanges();

    await new Promise(resolve => setTimeout(resolve, 50));

    const h3Count3 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    expect(h3Count3.length).toBe(0);
  });
});

@Component({
  selector: 'bs-popover-signal-host',
  imports: [BsPopoverDirective],
  template: `
    <button type="button" class="native">
      Native
      <ng-template [bsPopover]="position()" [updatePosition]="follow()"><div class="native-content">Native content</div></ng-template>
    </button>
    <span class="plain">
      Plain
      <div *bsPopover class="plain-content">Plain content</div>
    </span>`,
})
class SignalHostComponent {
  readonly position = signal<Position>('bottom');
  readonly follow = signal(false);
}

describe('BsPopoverDirective behaviour', () => {
  let fixture: ComponentFixture<SignalHostComponent>;
  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;
  const directives = () => fixture.debugElement.queryAllNodes(By.directive(BsPopoverDirective))
    .map((d) => d.injector.get(BsPopoverDirective));
  const settle = () => { fixture.detectChanges(); TestBed.tick(); };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OverlayModule, SignalHostComponent], providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(SignalHostComponent);
    settle();
  });

  afterEach(() => vi.useRealTimers());

  it('marks the trigger as a collapsed dialog disclosure controlling the popover', () => {
    const trigger = q('.native');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    settle();
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!);
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.textContent).toContain('Native content');
  });

  it('a click toggles it, and aria-expanded follows', () => {
    const trigger = q('.native');
    trigger.click();
    settle();
    expect(directives()[0].isVisible()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.click();
    settle();
    expect(directives()[0].isVisible()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves a native button alone, but makes a plain element a focusable button', () => {
    expect(q('.native').hasAttribute('tabindex')).toBe(false);
    expect(q('.native').hasAttribute('role')).toBe(false);
    expect(q('.plain').getAttribute('tabindex')).toBe('0');
    expect(q('.plain').getAttribute('role')).toBe('button');
  });

  it.each(['Enter', ' '])('the plain trigger opens with %j from the keyboard', (key) => {
    const ev = new KeyboardEvent('keydown', { key, cancelable: true });
    q('.plain').dispatchEvent(ev);
    settle();
    expect(ev.defaultPrevented).toBe(true);
    expect(directives()[1].isVisible()).toBe(true);
  });

  it('other keys on the plain trigger do nothing', () => {
    const ev = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    q('.plain').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(directives()[1].isVisible()).toBe(false);
  });

  it('Escape closes it only while it is the top overlay', () => {
    q('.native').click();
    settle();
    const stack = TestBed.inject(BsOverlayStackService);
    const above = stack.push();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(directives()[0].isVisible()).toBe(true);
    stack.release(above);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(directives()[0].isVisible()).toBe(false);
  });

  it.each([
    ['top', { originY: 'top', overlayY: 'bottom' }],
    ['start', { originX: 'start', overlayX: 'end' }],
    ['end', { originX: 'end', overlayX: 'start' }],
    ['bottom', { originY: 'bottom', overlayY: 'top' }],
  ] as const)('position %s attaches on that side', (position, expected) => {
    fixture.componentInstance.position.set(position);
    settle();
    expect(directives()[0].connectedPosition()).toEqual(expect.objectContaining(expected));
  });

  it('moving to another side re-anchors the overlay shortly after', () => {
    vi.useFakeTimers();
    const ref = (directives()[0] as unknown as { overlayRef: { updatePositionStrategy(s: unknown): void } }).overlayRef;
    const update = vi.spyOn(ref, 'updatePositionStrategy');
    fixture.componentInstance.position.set('top');
    settle();
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('with updatePosition, re-measures the anchor on every toggle', () => {
    fixture.componentInstance.follow.set(true);
    settle();
    const ref = (directives()[0] as unknown as { overlayRef: { updatePosition(): void } }).overlayRef;
    const update = vi.spyOn(ref, 'updatePosition');
    q('.native').click();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('releases its overlay and stack entry on destroy', () => {
    q('.native').click();
    settle();
    const stack = TestBed.inject(BsOverlayStackService);
    const release = vi.spyOn(stack, 'release');
    const ref = (directives()[0] as unknown as { overlayRef: { dispose(): void } }).overlayRef;
    const dispose = vi.spyOn(ref, 'dispose');
    fixture.destroy();
    expect(release).toHaveBeenCalled();
    expect(dispose).toHaveBeenCalled();
  });
});
