import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsSliderComponent, trackFraction } from './slider.component';

describe('BsSliderComponent', () => {
  let component: BsSliderComponent;
  let fixture: ComponentFixture<BsSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsSliderComponent ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('thumbLeft', () => {
    it('returns 0% at value=0', () => {
      component.value.set(0);
      expect(component.thumbLeft()).toBe('0%');
    });

    it('returns 50% at value=0.5', () => {
      component.value.set(0.5);
      expect(component.thumbLeft()).toBe('50%');
    });

    it('returns 100% at value=1', () => {
      component.value.set(1);
      expect(component.thumbLeft()).toBe('100%');
    });

    it('returns 25% at value=0.25', () => {
      component.value.set(0.25);
      expect(component.thumbLeft()).toBe('25%');
    });
  });

  describe('cursorClass', () => {
    it('contains position-absolute and top-0 so [style.left] takes effect and aligns vertically', () => {
      const cls = component.cursorClass();
      expect(cls).toContain('position-absolute');
      expect(cls).toContain('top-0');
    });
  });

  describe('keyboard', () => {
    const press = (key: string, shiftKey = false) => {
      const ev = new KeyboardEvent('keydown', { key, shiftKey, cancelable: true });
      fixture.nativeElement.dispatchEvent(ev);
      return ev;
    };

    it.each([
      ['ArrowRight', false, 0.51],
      ['ArrowUp', false, 0.51],
      ['ArrowLeft', false, 0.49],
      ['ArrowDown', false, 0.49],
      ['ArrowRight', true, 0.501],
      ['PageUp', false, 0.6],
      ['PageDown', false, 0.4],
      ['Home', false, 0],
      ['End', false, 1],
    ])('%s (shift=%s) moves the value from 0.5 to %s', (key, shift, expected) => {
      component.value.set(0.5);
      const ev = press(key as string, shift as boolean);
      expect(ev.defaultPrevented).toBe(true);
      expect(component.value()).toBeCloseTo(expected as number, 6);
    });

    it('clamps at both ends', () => {
      component.value.set(1);
      press('PageUp');
      expect(component.value()).toBe(1);
      component.value.set(0);
      press('ArrowLeft');
      expect(component.value()).toBe(0);
    });

    it('leaves other keys alone', () => {
      component.value.set(0.5);
      expect(press('Tab').defaultPrevented).toBe(false);
      expect(component.value()).toBe(0.5);
    });

    it('ignores keys while disabled, and leaves the tab order', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      component.value.set(0.5);
      press('End');
      expect(component.value()).toBe(0.5);
      expect(fixture.nativeElement.getAttribute('tabindex')).toBe('-1');
      expect(fixture.nativeElement.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('aria', () => {
    it('reports the scaled value and unit', () => {
      fixture.componentRef.setInput('valueScale', 360);
      fixture.componentRef.setInput('valueUnit', '°');
      component.value.set(0.5);
      fixture.detectChanges();
      const host: HTMLElement = fixture.nativeElement;
      expect(host.getAttribute('aria-valuemax')).toBe('360');
      expect(host.getAttribute('aria-valuenow')).toBe('180');
      expect(host.getAttribute('aria-valuetext')).toBe('180°');
    });
  });

  describe('pointer', () => {
    const track = () => fixture.nativeElement.querySelector('.track2') as HTMLElement;

    it('grabs on mousedown and releases on mouseup', () => {
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      track().dispatchEvent(down);
      fixture.detectChanges();
      expect(down.defaultPrevented).toBe(true);
      expect(component.cursorClass()).toContain('cursor-grabbing');
      document.dispatchEvent(new MouseEvent('mouseup'));
      expect(component.cursorClass()).toContain('cursor-grab');
      expect(component.cursorClass()).not.toContain('cursor-grabbing');
    });

    it('a track with no width (jsdom lays nothing out) keeps the value instead of turning it NaN', () => {
      component.value.set(0.3);
      track().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 0 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));
      expect(component.value()).toBe(0.3);
    });

    it('does not follow the mouse without a button press', () => {
      component.value.set(0.3);
      const move = new MouseEvent('mousemove', { clientX: 10, cancelable: true });
      document.dispatchEvent(move);
      expect(move.defaultPrevented).toBe(false);
    });

    it('ignores the pointer while disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      track().dispatchEvent(down);
      expect(down.defaultPrevented).toBe(false);
      expect(component.cursorClass()).not.toContain('cursor-grabbing');
    });
  });
});

describe('trackFraction', () => {
  it('is the pointer position along the track, clamped to 0..1', () => {
    expect(trackFraction(150, 100, 200)).toBe(0.25);
    expect(trackFraction(50, 100, 200)).toBe(0);
    expect(trackFraction(400, 100, 200)).toBe(1);
  });

  it('is null for a track with no width', () => {
    expect(trackFraction(150, 100, 0)).toBeNull();
  });
});
