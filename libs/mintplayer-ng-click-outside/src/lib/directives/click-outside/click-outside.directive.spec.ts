import { Component, ElementRef, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  selector: 'click-outside-test-component',
  imports: [ClickOutsideDirective],
  template: `
    <div #wrapper>
      @if (shown()) {
        <div #div
          (clickOutside)="received.push($event)"
          [clickOutsideEnabled]="enabled()"
          [attachOutsideOnClick]="attach()"
          [delayClickOutsideInit]="delay()"
          [emitOnBlur]="emitOnBlur()"
          [exclude]="exclude()"
          [clickOutsideEvents]="events()">
          Text
        </div>
      }
      <button #excluded>excluded</button>
    </div>`,
})
class ClickOutsideTestComponent {
  readonly shown = signal(true);
  readonly enabled = signal(true);
  readonly attach = signal(false);
  readonly delay = signal(false);
  readonly emitOnBlur = signal(false);
  readonly exclude = signal<HTMLElement[]>([]);
  readonly events = signal('');
  readonly received: Event[] = [];

  readonly div = viewChild<ElementRef<HTMLDivElement>>('div');
  readonly wrapper = viewChild.required<ElementRef<HTMLDivElement>>('wrapper');
  readonly excluded = viewChild.required<ElementRef<HTMLButtonElement>>('excluded');
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<ClickOutsideTestComponent>;
  let host: ClickOutsideTestComponent;

  const inside = () => host.div()!.nativeElement;
  const outside = () => host.wrapper().nativeElement;
  const fire = (target: HTMLElement, type: string) => target.dispatchEvent(new Event(type, { bubbles: true }));

  async function create(platformId = 'browser') {
    TestBed.configureTestingModule({
      imports: [ClickOutsideTestComponent],
      providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(ClickOutsideTestComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('in the browser', () => {
    beforeEach(() => create());

    it('emits for a click outside the element, never for one inside it', () => {
      inside().click();
      expect(host.received).toHaveLength(0);

      outside().click();
      expect(host.received).toHaveLength(1);
      expect(host.received[0].target).toBe(outside());

      inside().click();
      expect(host.received).toHaveLength(1);
    });

    it('stays silent while disabled', () => {
      host.enabled.set(false);
      fixture.detectChanges();
      outside().click();
      expect(host.received).toHaveLength(0);
    });

    it('ignores clicks inside an excluded element, reading the list at click time', () => {
      host.exclude.set([host.excluded().nativeElement]);
      fixture.detectChanges();
      host.excluded().nativeElement.click();
      expect(host.received).toHaveLength(0);

      host.exclude.set([]);
      fixture.detectChanges();
      host.excluded().nativeElement.click();
      expect(host.received).toHaveLength(1);
    });

    it('listens to the configured event names instead of click', () => {
      host.events.set('mousedown, touchstart');
      fixture.detectChanges();

      outside().click();
      expect(host.received).toHaveLength(0);

      fire(outside(), 'mousedown');
      fire(outside(), 'touchstart');
      expect(host.received.map((e) => e.type)).toEqual(['mousedown', 'touchstart']);
    });

    // The leak: re-initialising added the new listeners without removing the old,
    // so the original 'click' kept emitting after the events were changed.
    it('drops the old listeners when the event names change', () => {
      host.events.set('mousedown');
      fixture.detectChanges();
      outside().click();
      expect(host.received).toHaveLength(0);

      host.events.set('');
      fixture.detectChanges();
      fire(outside(), 'mousedown');
      expect(host.received).toHaveLength(0);
      outside().click();
      expect(host.received).toHaveLength(1);
    });

    it('with attachOutsideOnClick, arms only after a click on the element and disarms after emitting', () => {
      host.attach.set(true);
      fixture.detectChanges();

      outside().click();
      expect(host.received).toHaveLength(0);

      inside().click();
      outside().click();
      expect(host.received).toHaveLength(1);

      // Disarmed until the element is clicked again.
      outside().click();
      expect(host.received).toHaveLength(1);
    });

    it('drops the document listener when attachOutsideOnClick is turned on', () => {
      host.attach.set(true);
      fixture.detectChanges();
      outside().click();
      expect(host.received).toHaveLength(0);
    });

    it('drops the element listener when attachOutsideOnClick is turned off', () => {
      host.attach.set(true);
      fixture.detectChanges();
      host.attach.set(false);
      fixture.detectChanges();

      outside().click();
      expect(host.received).toHaveLength(1);
      inside().click();
      outside().click();
      expect(host.received).toHaveLength(2);
    });

    it('stops listening once destroyed', () => {
      host.shown.set(false);
      fixture.detectChanges();
      outside().click();
      expect(host.received).toHaveLength(0);
    });
  });

  describe('with timers', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await create();
    });

    it('delays arming by a tick when delayClickOutsideInit is set', () => {
      host.delay.set(true);
      host.events.set('click');   // forces a re-init under the new delay setting
      fixture.detectChanges();

      outside().click();
      expect(host.received).toHaveLength(0);

      vi.runOnlyPendingTimers();
      outside().click();
      expect(host.received).toHaveLength(1);
    });

    it('never arms a delayed listener after the directive is destroyed', () => {
      host.delay.set(true);
      host.events.set('click');
      fixture.detectChanges();
      host.shown.set(false);
      fixture.detectChanges();

      vi.runOnlyPendingTimers();
      outside().click();
      expect(host.received).toHaveLength(0);
    });

    it('emits on window blur (an iframe took focus) while the document is visible', () => {
      host.emitOnBlur.set(true);
      fixture.detectChanges();

      window.dispatchEvent(new Event('blur'));
      expect(host.received).toHaveLength(0);
      vi.runOnlyPendingTimers();
      expect(host.received.map((e) => e.type)).toEqual(['blur']);
    });

    it('does not emit on window blur when the document is hidden', () => {
      host.emitOnBlur.set(true);
      fixture.detectChanges();
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      try {
        window.dispatchEvent(new Event('blur'));
        vi.runOnlyPendingTimers();
        expect(host.received).toHaveLength(0);
      } finally {
        hidden.mockRestore();
      }
    });

    it('stops listening for blur when emitOnBlur is turned off', () => {
      host.emitOnBlur.set(true);
      fixture.detectChanges();
      host.emitOnBlur.set(false);
      fixture.detectChanges();

      window.dispatchEvent(new Event('blur'));
      vi.runOnlyPendingTimers();
      expect(host.received).toHaveLength(0);
    });
  });

  describe('on the server', () => {
    beforeEach(() => create('server'));

    it('registers nothing and emits nothing', () => {
      const add = vi.spyOn(document, 'addEventListener');
      host.events.set('mousedown');
      fixture.detectChanges();
      outside().click();
      fire(outside(), 'mousedown');
      expect(host.received).toHaveLength(0);
      expect(add).not.toHaveBeenCalled();
      add.mockRestore();
      host.shown.set(false);
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });
});
