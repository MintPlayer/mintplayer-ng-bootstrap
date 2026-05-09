import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRovingFocusDirective, BsRovingFocusMode, BsRovingFocusOrientation } from './roving-focus.directive';
import { BsRovingFocusItemDirective } from './roving-focus-item.directive';

@Component({
  selector: 'bs-rovingfocus-harness',
  imports: [BsRovingFocusDirective, BsRovingFocusItemDirective],
  template: `
    <ul
      bsRovingFocus
      [orientation]="orientation()"
      [mode]="mode()"
      [wrap]="wrap()"
      data-testid="container"
    >
      @for (label of labels(); track label) {
        <li bsRovingFocusItem [disabled]="disabled().includes(label)">{{ label }}</li>
      }
    </ul>
  `,
})
class HarnessComponent {
  labels = signal(['A', 'B', 'C', 'D']);
  disabled = signal<string[]>([]);
  orientation = signal<BsRovingFocusOrientation>('vertical');
  mode = signal<BsRovingFocusMode>('tabindex');
  wrap = signal(true);
}

describe('BsRovingFocusDirective', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const items = () => Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('li'));
  const container = () => fixture.nativeElement.querySelector<HTMLElement>('[data-testid="container"]')!;
  const press = (key: string) => {
    container().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };

  describe('tabindex mode (default)', () => {
    it('first item has tabindex=0; others -1', () => {
      const tabindexes = items().map(li => li.getAttribute('tabindex'));
      expect(tabindexes).toEqual(['0', '-1', '-1', '-1']);
    });

    it('ArrowDown moves the active tabindex forward', () => {
      items()[0].focus();
      press('ArrowDown');
      expect(items().map(li => li.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
      expect(document.activeElement).toBe(items()[1]);
    });

    it('ArrowUp moves backward', () => {
      items()[0].focus();
      press('ArrowDown');
      press('ArrowDown');
      expect(items()[2].getAttribute('tabindex')).toBe('0');

      press('ArrowUp');
      expect(items()[1].getAttribute('tabindex')).toBe('0');
    });

    it('Home jumps to first, End jumps to last', () => {
      items()[0].focus();
      press('End');
      expect(items()[3].getAttribute('tabindex')).toBe('0');
      press('Home');
      expect(items()[0].getAttribute('tabindex')).toBe('0');
    });

    it('wraps from last to first when wrap=true', () => {
      items()[0].focus();
      press('End');
      press('ArrowDown');
      expect(items()[0].getAttribute('tabindex')).toBe('0');
    });

    it('clamps at the boundaries when wrap=false', () => {
      host.wrap.set(false);
      fixture.detectChanges();
      items()[0].focus();
      press('ArrowUp');
      expect(items()[0].getAttribute('tabindex')).toBe('0');
      press('End');
      press('ArrowDown');
      expect(items()[3].getAttribute('tabindex')).toBe('0');
    });

    it('skips disabled items', () => {
      host.disabled.set(['B']);
      fixture.detectChanges();
      items()[0].focus();
      press('ArrowDown');
      expect(items()[2].getAttribute('tabindex')).toBe('0');
    });

    it('clicking an item makes it active', () => {
      items()[2].focus();
      fixture.detectChanges();
      expect(items()[2].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('horizontal orientation', () => {
    beforeEach(() => {
      host.orientation.set('horizontal');
      fixture.detectChanges();
    });

    it('ArrowRight/ArrowLeft step; ArrowDown/ArrowUp ignored', () => {
      items()[0].focus();
      press('ArrowRight');
      expect(items()[1].getAttribute('tabindex')).toBe('0');
      press('ArrowDown');
      expect(items()[1].getAttribute('tabindex')).toBe('0');
      press('ArrowLeft');
      expect(items()[0].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('both orientation', () => {
    beforeEach(() => {
      host.orientation.set('both');
      fixture.detectChanges();
    });

    it('all four arrow keys step', () => {
      items()[0].focus();
      press('ArrowDown');
      expect(items()[1].getAttribute('tabindex')).toBe('0');
      press('ArrowRight');
      expect(items()[2].getAttribute('tabindex')).toBe('0');
      press('ArrowLeft');
      expect(items()[1].getAttribute('tabindex')).toBe('0');
      press('ArrowUp');
      expect(items()[0].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('activedescendant mode', () => {
    let directive: BsRovingFocusDirective;

    beforeEach(() => {
      host.mode.set('activedescendant');
      fixture.detectChanges();
      directive = fixture.debugElement.query(el => el.nativeElement === container()).injector.get(BsRovingFocusDirective);
    });

    it('all items have tabindex=-1 (no roving tabindex)', () => {
      const tabindexes = items().map(li => li.getAttribute('tabindex'));
      expect(tabindexes.every(v => v === '-1')).toBe(true);
    });

    it('exposes activeDescendantId pointing at the first item', () => {
      expect(directive.activeDescendantId()).toBe(items()[0].id);
      expect(items()[0].id).toMatch(/^bs-rovingitem-\d+$/);
    });

    it('arrow keys update activeDescendantId without moving browser focus to any item', () => {
      press('ArrowDown');
      expect(directive.activeDescendantId()).toBe(items()[1].id);
      expect(items().some(li => li === document.activeElement)).toBe(false);
    });
  });
});
