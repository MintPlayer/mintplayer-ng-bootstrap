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
});
