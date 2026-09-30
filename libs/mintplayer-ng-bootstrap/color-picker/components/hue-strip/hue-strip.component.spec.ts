import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsHueStripComponent } from './hue-strip.component';

describe('BsHueStripComponent', () => {
  let fixture: ComponentFixture<BsHueStripComponent>;
  let component: BsHueStripComponent;
  const slider = () => fixture.nativeElement.querySelector('bs-slider') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BsHueStripComponent);
    component = fixture.componentInstance;
    component.hs.set({ hue: 180, saturation: 0.4 });
    fixture.detectChanges();
  });

  it('exposes the hue as a degree slider named "Hue"', () => {
    const s = slider();
    expect(s.getAttribute('role')).toBe('slider');
    expect(s.getAttribute('aria-label')).toBe('Hue');
    expect(s.getAttribute('aria-valuemax')).toBe('360');
    expect(s.getAttribute('aria-valuenow')).toBe('180');
    expect(s.getAttribute('aria-valuetext')).toBe('180°');
  });

  it('colours the thumb with the current hue at full saturation', () => {
    expect(component.thumbBackground()).toBe('hsl(180, 100%, 50%)');
    expect(component.trackGradient).toContain('hsl(360, 100%, 50%)');
  });

  it('changes only the hue when the slider moves, keeping the saturation', () => {
    slider().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', cancelable: true }));
    expect(component.hs()).toEqual({ hue: 360, saturation: 0.4 });
  });

  it('forwards disabled to the slider', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(slider().getAttribute('aria-disabled')).toBe('true');
  });
});
