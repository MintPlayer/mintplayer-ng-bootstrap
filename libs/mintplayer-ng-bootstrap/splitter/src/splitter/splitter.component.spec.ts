import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { SplitterResizeEventDetail } from '@mintplayer/web-components/splitter';
import { BsSplitterComponent } from './splitter.component';

@Component({
  selector: 'splitter-test',
  template: `
    <bs-splitter
      [orientation]="orientation()"
      [minPanelSize]="minPanelSize()"
      [touchMode]="touchMode()"
      (resizeStart)="outerEvents.push(['start', $event])"
      (resizing)="outerEvents.push(['resizing', $event])"
      (resizeEnd)="outerEvents.push(['end', $event])">
      <div>Panel 1</div>
      <bs-splitter
        orientation="vertical"
        (resizeEnd)="innerEvents.push(['end', $event])">
        <div>Panel 2a</div>
        <div>Panel 2b</div>
      </bs-splitter>
    </bs-splitter>`,
  imports: [BsSplitterComponent],
})
class SplitterTestComponent {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  minPanelSize = signal<number | null>(null);
  touchMode = signal(false);

  outerEvents: [string, SplitterResizeEventDetail][] = [];
  innerEvents: [string, SplitterResizeEventDetail][] = [];

  outer = viewChild.required(BsSplitterComponent);
}

describe('BsSplitterComponent', () => {
  let component: SplitterTestComponent;
  let fixture: ComponentFixture<SplitterTestComponent>;

  const outerElement = () =>
    fixture.nativeElement.querySelector('mp-splitter') as HTMLElement;
  const innerElement = () =>
    fixture.nativeElement.querySelectorAll('mp-splitter')[1] as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitterTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitterTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(outerElement()).toBeTruthy();
  });

  describe('attribute bridging', () => {
    it('should reflect orientation', () => {
      expect(outerElement().getAttribute('orientation')).toBe('horizontal');
      component.orientation.set('vertical');
      fixture.detectChanges();
      expect(outerElement().getAttribute('orientation')).toBe('vertical');
    });

    it('should only set min-panel-size when provided', () => {
      expect(outerElement().hasAttribute('min-panel-size')).toBe(false);
      component.minPanelSize.set(80);
      fixture.detectChanges();
      expect(outerElement().getAttribute('min-panel-size')).toBe('80');
      component.minPanelSize.set(null);
      fixture.detectChanges();
      expect(outerElement().hasAttribute('min-panel-size')).toBe(false);
    });

    it('should reflect touch-mode as a presence attribute', () => {
      expect(outerElement().hasAttribute('touch-mode')).toBe(false);
      component.touchMode.set(true);
      fixture.detectChanges();
      expect(outerElement().getAttribute('touch-mode')).toBe('');
    });
  });

  describe('event re-emit', () => {
    const detail: SplitterResizeEventDetail = {
      sizes: [100, 200],
      orientation: 'horizontal',
    };
    const resizeEvent = (type: string) =>
      new CustomEvent<SplitterResizeEventDetail>(type, { bubbles: true, detail });

    it('should re-emit the three resize events from its own element exactly once', () => {
      outerElement().dispatchEvent(resizeEvent('resize-start'));
      outerElement().dispatchEvent(resizeEvent('resizing'));
      outerElement().dispatchEvent(resizeEvent('resize-end'));
      // Exactly one entry per event with the typed detail — in particular the
      // `resizing` binding must NOT also receive the identically-named DOM
      // CustomEvent (Angular registers both a DOM listener and the output).
      expect(component.outerEvents).toEqual([
        ['start', detail],
        ['resizing', detail],
        ['end', detail],
      ]);
    });

    it('should stop a claimed event at the wrapper that re-emitted it', () => {
      const seenOnRoot: Event[] = [];
      (fixture.nativeElement as HTMLElement)
        .addEventListener('resize-end', e => seenOnRoot.push(e));

      innerElement().dispatchEvent(resizeEvent('resize-end'));

      // The inner wrapper claims its own event...
      expect(component.innerEvents).toEqual([['end', detail]]);
      // ...so the outer wrapper never re-emits it as its own...
      expect(component.outerEvents).toEqual([]);
      // ...and it doesn't bubble past the wrapper that claimed it.
      expect(seenOnRoot.length).toBe(0);
    });

    it('should let an unclaimed event bubble untouched', () => {
      const seenOnRoot: Event[] = [];
      (fixture.nativeElement as HTMLElement)
        .addEventListener('resize-end', e => seenOnRoot.push(e));

      // A raw (non-wrapped) descendant dispatching a splitter event: no
      // wrapper claims it — no output fires, and it keeps bubbling for
      // delegation-style listeners.
      const pane = fixture.nativeElement.querySelector('div') as HTMLElement;
      pane.dispatchEvent(resizeEvent('resize-end'));

      expect(component.outerEvents).toEqual([]);
      expect(component.innerEvents).toEqual([]);
      expect(seenOnRoot.length).toBe(1);
    });
  });

  describe('method delegation', () => {
    it('should delegate the size API to the element', () => {
      const element = outerElement() as HTMLElement & {
        getPanelSizes(): number[];
        setPanelSizes(sizes: number[]): void;
        resizeDividerBy(index: number, key: string, fine?: boolean): void;
      };
      const setSpy = vi.spyOn(element, 'setPanelSizes');
      const getSpy = vi.spyOn(element, 'getPanelSizes').mockReturnValue([1, 2]);
      const resizeSpy = vi.spyOn(element, 'resizeDividerBy').mockImplementation(() => void 0);

      component.outer().setPanelSizes([100, 200]);
      expect(setSpy).toHaveBeenCalledWith([100, 200]);

      expect(component.outer().getPanelSizes()).toEqual([1, 2]);
      expect(getSpy).toHaveBeenCalled();

      component.outer().resizeDividerBy(0, 'ArrowRight', true);
      expect(resizeSpy).toHaveBeenCalledWith(0, 'ArrowRight', true);
    });
  });
});
