import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSaturationStripComponent } from './saturation-strip.component';

describe('BsSaturationStripComponent', () => {
  let fixture: ComponentFixture<BsSaturationStripComponent>;
  let component: BsSaturationStripComponent;
  const slider = () => fixture.nativeElement.querySelector('bs-slider') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BsSaturationStripComponent);
    component = fixture.componentInstance;
    component.hs.set({ hue: 120.4, saturation: 0.25 });
    fixture.detectChanges();
  });

  it('exposes the saturation as a percent slider named "Saturation"', () => {
    const s = slider();
    expect(s.getAttribute('aria-label')).toBe('Saturation');
    expect(s.getAttribute('aria-valuenow')).toBe('25');
    expect(s.getAttribute('aria-valuetext')).toBe('25%');
  });

  it('derives the track from grey to the pure current hue, and the thumb from both channels', () => {
    expect(component.trackGradient()).toBe('linear-gradient(to right, hsl(120, 0%, 50%), hsl(120, 100%, 50%))');
    expect(component.thumbBackground()).toBe('hsl(120, 25%, 50%)');
  });

  it('changes only the saturation when the slider moves, keeping the hue', () => {
    slider().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
    expect(component.hs()).toEqual({ hue: 120.4, saturation: 0 });
  });
});
