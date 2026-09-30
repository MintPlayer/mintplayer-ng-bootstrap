import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Directionality } from '@angular/cdk/bidi';
import { BsResizableComponent } from '../resizable/resizable.component';
import { BsResizableLabels } from '../interfaces/resize-labels';
import { ResizablePositioning } from '../types/positioning';
import { BsResizeGlyphDirective } from './resize-glyph.directive';

@Component({
  imports: [BsResizableComponent],
  template: `<bs-resizable [positioning]="positioning()" [labels]="labels()"><p>content</p></bs-resizable>`,
})
class HostComponent {
  readonly positioning = signal<ResizablePositioning>('absolute');
  readonly labels = signal<Partial<BsResizableLabels>>({});
}

function setup(dir: 'ltr' | 'rtl' = 'ltr') {
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [{ provide: Directionality, useValue: { valueSignal: signal(dir), value: dir } }],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

const resizableOf = (f: ComponentFixture<HostComponent>) =>
  f.debugElement.query(By.directive(BsResizableComponent)).componentInstance as BsResizableComponent;

/** The glyph element for a logical position list, as the template declares them. */
function glyph(f: ComponentFixture<HostComponent>, positions: string[]): HTMLElement {
  const match = f.debugElement.queryAll(By.directive(BsResizeGlyphDirective))
    .find((d) => d.injector.get(BsResizeGlyphDirective).bsResizeGlyph().join() === positions.join());
  return match!.nativeElement;
}

function key(el: HTMLElement, k: string, shiftKey = false) {
  const ev = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
}

function touch(el: HTMLElement, type: string, points: { clientX: number; clientY: number }[]) {
  const ev = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: points });
  el.dispatchEvent(ev);
  return ev;
}

describe('BsResizeGlyphDirective', () => {
  describe('roles, names and placement', () => {
    it('renders every glyph as a focusable separator', () => {
      const f = setup();
      const all = f.debugElement.queryAll(By.directive(BsResizeGlyphDirective)).map((d) => d.nativeElement as HTMLElement);
      expect(all).toHaveLength(8);
      expect(all.every((el) => el.getAttribute('role') === 'separator' && el.getAttribute('tabindex') === '0')).toBe(true);
    });

    it('names edges and corners by their physical side in a left-to-right document', () => {
      const f = setup();
      expect(glyph(f, ['start']).getAttribute('aria-label')).toBe('Resize from left edge');
      expect(glyph(f, ['end']).getAttribute('aria-label')).toBe('Resize from right edge');
      expect(glyph(f, ['top']).getAttribute('aria-label')).toBe('Resize from top edge');
      expect(glyph(f, ['bottom']).getAttribute('aria-label')).toBe('Resize from bottom edge');
      expect(glyph(f, ['top', 'start']).getAttribute('aria-label')).toBe('Resize from top-left corner');
      expect(glyph(f, ['bottom', 'end']).getAttribute('aria-label')).toBe('Resize from bottom-right corner');
    });

    it('places a start glyph on the left edge in a left-to-right document', () => {
      const f = setup();
      expect(glyph(f, ['start']).classList).toContain('left');
      const corner = glyph(f, ['top', 'end']).classList;
      expect(corner.contains('top') && corner.contains('right') && !corner.contains('end')).toBe(true);
    });

    it('in a right-to-left document a start glyph sits on, and is named as, the right edge', () => {
      const f = setup('rtl');
      const start = glyph(f, ['start']);
      expect(start.classList).toContain('right');
      expect(start.getAttribute('aria-label')).toBe('Resize from right edge');
      expect(glyph(f, ['bottom', 'start']).getAttribute('aria-label')).toBe('Resize from bottom-right corner');
      expect(glyph(f, ['top', 'end']).getAttribute('aria-label')).toBe('Resize from top-left corner');
    });

    it('takes translated names from the resizable, keeping the default for missing keys', () => {
      const f = setup();
      f.componentInstance.labels.set({ left: 'Links vergroten', topRight: 'Rechtsboven vergroten' });
      f.detectChanges();
      expect(glyph(f, ['start']).getAttribute('aria-label')).toBe('Links vergroten');
      expect(glyph(f, ['top', 'end']).getAttribute('aria-label')).toBe('Rechtsboven vergroten');
      expect(glyph(f, ['end']).getAttribute('aria-label')).toBe('Resize from right edge');
    });

    it('orients a single-edge separator across its edge and leaves corners unoriented', () => {
      const f = setup();
      expect(glyph(f, ['top']).getAttribute('aria-orientation')).toBe('horizontal');
      expect(glyph(f, ['start']).getAttribute('aria-orientation')).toBe('vertical');
      expect(glyph(f, ['top', 'start']).hasAttribute('aria-orientation')).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('absolute: ArrowLeft on the start glyph moves the left edge left and keeps the right edge', () => {
      const f = setup();
      const r = resizableOf(f);
      const ev = key(glyph(f, ['start']), 'ArrowLeft');
      expect(ev.defaultPrevented).toBe(true);
      // jsdom lays nothing out: the box starts at 0 wide at offset 0, so its right edge is 0
      expect(r.left()).toBe(-10);
      expect(r.width()).toBe(10);
      expect(r.left()! + r.width()!).toBe(0);
    });

    it('absolute: ArrowUp on the top glyph moves the top edge up and keeps the bottom edge', () => {
      const f = setup();
      const r = resizableOf(f);
      key(glyph(f, ['top']), 'ArrowUp');
      expect(r.top()).toBe(-10);
      expect(r.height()).toBe(10);
    });

    it('absolute: Shift makes a 1px step on the end glyph', () => {
      const f = setup();
      const r = resizableOf(f);
      key(glyph(f, ['end']), 'ArrowRight', true);
      // widening from 0 is clamped to the minimum size of 10; the step itself is 1px
      expect(r.width()).toBe(10);
      expect(r.left()).toBeUndefined();
    });

    it('inline: an arrow key writes the margins a drag writes, never the width', () => {
      const f = setup();
      f.componentInstance.positioning.set('inline');
      f.detectChanges();
      const r = resizableOf(f);
      r.marginLeft.set(30);
      f.detectChanges();
      key(glyph(f, ['start']), 'ArrowLeft');
      expect(r.marginLeft()).toBe(20);
      expect(r.width()).toBeUndefined();
    });

    it('inline: the bottom glyph trades margin for height', () => {
      const f = setup();
      f.componentInstance.positioning.set('inline');
      f.detectChanges();
      const r = resizableOf(f);
      r.marginBottom.set(40);
      f.detectChanges();
      key(glyph(f, ['bottom']), 'ArrowDown');
      expect(r.height()).toBe(10);
      expect(r.marginBottom()).toBe(30);
    });

    it('ignores keys the glyph does not handle, without preventing their default', () => {
      const f = setup();
      const r = resizableOf(f);
      expect(key(glyph(f, ['top']), 'ArrowLeft').defaultPrevented).toBe(false);
      expect(key(glyph(f, ['start']), 'Tab').defaultPrevented).toBe(false);
      expect(r.width()).toBeUndefined();
      expect(r.height()).toBeUndefined();
    });

    it('in a right-to-left document the start glyph resizes the right edge', () => {
      const f = setup('rtl');
      const r = resizableOf(f);
      key(glyph(f, ['start']), 'ArrowRight');
      expect(r.width()).toBe(10);
      expect(r.left()).toBeUndefined();
    });
  });

  describe('mouse drag', () => {
    it('drags the bottom edge while the button is held, and stops on mouseup', () => {
      const f = setup();
      const r = resizableOf(f);
      const bottom = glyph(f, ['bottom']);
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      bottom.dispatchEvent(down);
      f.detectChanges();
      expect(down.defaultPrevented).toBe(true);
      expect(bottom.classList).toContain('active');

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 60 }));
      expect(r.height()).toBe(60);

      document.dispatchEvent(new MouseEvent('mouseup'));
      f.detectChanges();
      expect(bottom.classList).not.toContain('active');
      expect(r.resizeAction).toBeUndefined();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 90 }));
      expect(r.height()).toBe(60);
    });

    it('only the glyph that started the drag applies the move', () => {
      const f = setup();
      const r = resizableOf(f);
      glyph(f, ['bottom']).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 40 }));
      // every glyph listens on the document; the side glyphs must not resize horizontally
      expect(r.width()).toBeUndefined();
      expect(r.left()).toBeUndefined();
      expect(r.height()).toBe(40);
    });

    it('a mouse move with no drag in progress changes nothing', () => {
      const f = setup();
      const r = resizableOf(f);
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 40 }));
      expect(r.height()).toBeUndefined();
    });
  });

  describe('touch drag', () => {
    it('drags the end edge with one finger and ends on touchend', () => {
      const f = setup();
      const r = resizableOf(f);
      const end = glyph(f, ['end']);
      const start = touch(end, 'touchstart', [{ clientX: 0, clientY: 0 }]);
      expect(start.defaultPrevented).toBe(true);
      touch(end, 'touchmove', [{ clientX: 80, clientY: 0 }]);
      expect(r.width()).toBe(80);
      const stop = touch(end, 'touchend', []);
      expect(stop.defaultPrevented).toBe(true);
      expect(r.resizeAction).toBeUndefined();
    });

    it('ignores a multi-finger move', () => {
      const f = setup();
      const r = resizableOf(f);
      const end = glyph(f, ['end']);
      touch(end, 'touchstart', [{ clientX: 0, clientY: 0 }]);
      const move = touch(end, 'touchmove', [{ clientX: 80, clientY: 0 }, { clientX: 90, clientY: 0 }]);
      expect(move.defaultPrevented).toBe(false);
      expect(r.width()).toBeUndefined();
    });
  });
});
