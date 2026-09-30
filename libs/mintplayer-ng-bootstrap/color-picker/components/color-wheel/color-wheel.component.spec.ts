import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsColorWheelComponent } from './color-wheel.component';
import { hs2polar } from '../../color-math';

describe('BsColorWheelComponent', () => {
  let component: BsColorWheelComponent;
  let fixture: ComponentFixture<BsColorWheelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsColorWheelComponent ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsColorWheelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('width', 200);
    fixture.componentRef.setInput('height', 200);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('markerPosition', () => {
    it('places marker at disc center for saturation = 0', () => {
      component.hs.set({ hue: 0, saturation: 0 });
      const marker = component.markerPosition();
      expect(marker.x).toBeCloseTo(100, 5);
      expect(marker.y).toBeCloseTo(100, 5);
    });

    it('places marker on rim at hue=0 (3 o\'clock) for full saturation', () => {
      component.hs.set({ hue: 0, saturation: 1 });
      const marker = component.markerPosition();
      expect(marker.x).toBeCloseTo(200, 5);
      expect(marker.y).toBeCloseTo(100, 5);
    });

    it('matches hs2polar for blue (hue=240, sat=1)', () => {
      component.hs.set({ hue: 240, saturation: 1 });
      const polar = hs2polar(240, 1, 100);
      const marker = component.markerPosition();
      expect(marker.x).toBeCloseTo(100 + polar.dx, 5);
      expect(marker.y).toBeCloseTo(100 + polar.dy, 5);
    });

    it('shifts horizontally for non-square width > height (centered disc)', () => {
      fixture.componentRef.setInput('width', 300);
      fixture.componentRef.setInput('height', 200);
      component.hs.set({ hue: 0, saturation: 0 });
      const marker = component.markerPosition();
      expect(marker.x).toBeCloseTo(150, 5);
      expect(marker.y).toBeCloseTo(100, 5);
    });

    it('handles half-saturation as half-radius', () => {
      component.hs.set({ hue: 0, saturation: 0.5 });
      const marker = component.markerPosition();
      expect(marker.x).toBeCloseTo(150, 5);
      expect(marker.y).toBeCloseTo(100, 5);
    });
  });

  describe('overlayOpacity', () => {
    it('is 0 at brightness=1', () => {
      fixture.componentRef.setInput('brightness', 1);
      expect(component.overlayOpacity()).toBe(0);
    });

    it('is 1 at brightness=0', () => {
      fixture.componentRef.setInput('brightness', 0);
      expect(component.overlayOpacity()).toBe(1);
    });

    it('is 0.5 at brightness=0.5', () => {
      fixture.componentRef.setInput('brightness', 0.5);
      expect(component.overlayOpacity()).toBe(0.5);
    });
  });

  describe('keyboard (5 steps, Shift for 1)', () => {
    const press = (key: string, shiftKey = false) => {
      const ev = new KeyboardEvent('keydown', { key, shiftKey, cancelable: true });
      fixture.nativeElement.dispatchEvent(ev);
      return ev;
    };

    it.each([
      ['ArrowRight', false, 105, 0.5],
      ['ArrowLeft', false, 95, 0.5],
      ['ArrowRight', true, 101, 0.5],
      ['ArrowUp', false, 100, 0.55],
      ['ArrowDown', false, 100, 0.45],
      ['ArrowDown', true, 100, 0.49],
      ['PageUp', false, 130, 0.5],
      ['PageDown', false, 70, 0.5],
      ['Home', false, 100, 1],
      ['End', false, 100, 0],
    ])('%s (shift=%s) from hue 100 / saturation 0.5 gives hue %s, saturation %s', (key, shift, hue, sat) => {
      component.hs.set({ hue: 100, saturation: 0.5 });
      const ev = press(key as string, shift as boolean);
      expect(ev.defaultPrevented).toBe(true);
      expect(component.hs().hue).toBeCloseTo(hue as number, 6);
      expect(component.hs().saturation).toBeCloseTo(sat as number, 6);
    });

    it('wraps the hue around 0/360 in both directions', () => {
      component.hs.set({ hue: 358, saturation: 0.5 });
      press('ArrowRight');
      expect(component.hs().hue).toBe(3);
      component.hs.set({ hue: 10, saturation: 0.5 });
      press('PageDown');
      expect(component.hs().hue).toBe(340);
    });

    it('clamps the saturation, and a no-op key emits no change', () => {
      component.hs.set({ hue: 0, saturation: 1 });
      const before = component.hs();
      press('ArrowUp');
      expect(component.hs()).toBe(before);
    });

    it('leaves unrelated keys unhandled', () => {
      expect(press('a').defaultPrevented).toBe(false);
    });

    it('ignores keys while disabled and leaves the tab order', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      component.hs.set({ hue: 100, saturation: 0.5 });
      press('Home');
      expect(component.hs().saturation).toBe(0.5);
      expect(fixture.nativeElement.getAttribute('tabindex')).toBe('-1');
      expect(fixture.nativeElement.getAttribute('aria-disabled')).toBe('true');
    });

    it('announces the hue and saturation', () => {
      component.hs.set({ hue: 99.6, saturation: 0.254 });
      fixture.detectChanges();
      expect(fixture.nativeElement.getAttribute('aria-valuetext')).toBe('Hue 100°, saturation 25%');
    });
  });

  describe('pointer', () => {
    // jsdom lays nothing out, so the surface sits at the viewport origin: a pointer at
    // (x, y) is (x - radius, y - radius) from the centre of a 200px wheel.
    const surface = () => fixture.nativeElement.querySelector('.wheel-surface') as HTMLElement;

    it('picks the colour under the mouse and follows it until mouseup', () => {
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 200, clientY: 100 });
      surface().dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      expect(component.hs().hue).toBeCloseTo(0, 6);
      expect(component.hs().saturation).toBeCloseTo(1, 6);

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 150 }));
      expect(component.hs().hue).toBeCloseTo(90, 6);
      expect(component.hs().saturation).toBeCloseTo(0.5, 6);

      document.dispatchEvent(new MouseEvent('mouseup'));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      expect(component.hs().saturation).toBeCloseTo(0.5, 6);
    });

    it('follows a touch without preventing its default (so the page can still scroll)', () => {
      const touch = (type: string, x: number, y: number) => {
        const ev = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: [{ clientX: x, clientY: y }] });
        surface().dispatchEvent(ev);
        return ev;
      };
      expect(touch('touchstart', 100, 0).defaultPrevented).toBe(false);
      expect(component.hs().hue).toBeCloseTo(270, 6);
      touch('touchmove', 0, 100);
      expect(component.hs().hue).toBeCloseTo(180, 6);
      touch('touchend', 0, 100);
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 100 }));
      expect(component.hs().hue).toBeCloseTo(180, 6);
    });

    it('ignores the pointer while disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      component.hs.set({ hue: 10, saturation: 0.1 });
      surface().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 200, clientY: 100 }));
      expect(component.hs()).toEqual({ hue: 10, saturation: 0.1 });
    });
  });
});
