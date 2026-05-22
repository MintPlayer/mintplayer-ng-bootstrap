import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsColorPickerComponent } from './color-picker.component';
import { BsColorPickerValueAccessor } from '../../directives/color-picker-value-accessor/color-picker-value-accessor.directive';
import { BsAlphaStripComponent } from '../alpha-strip/alpha-strip.component';
import { BsBrightnessStripComponent } from '../brightness-strip/brightness-strip.component';
import { BsColorWheelComponent } from '../color-wheel/color-wheel.component';
describe('ColorPickerComponent', () => {
  let component: BsColorPickerComponent;
  let accessor: BsColorPickerValueAccessor;
  let fixture: ComponentFixture<BsColorPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsColorPickerComponent,
        MockComponent(BsAlphaStripComponent),
        MockComponent(BsBrightnessStripComponent),
        MockComponent(BsColorWheelComponent),
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsColorPickerComponent);
    component = fixture.componentInstance;
    accessor = fixture.debugElement.injector.get(BsColorPickerValueAccessor);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('writeValue', () => {
    it('parses a 6-digit hex into hue/saturation/brightness', () => {
      accessor.writeValue('#0000FF');
      expect(component.hs().hue).toBeCloseTo(240, 0);
      expect(component.hs().saturation).toBeCloseTo(1, 5);
      expect(component.brightness()).toBeCloseTo(1, 5);
    });

    it('parses a 3-digit hex', () => {
      accessor.writeValue('#f00');
      expect(component.hs().hue).toBeCloseTo(0, 0);
      expect(component.hs().saturation).toBeCloseTo(1, 5);
      expect(component.brightness()).toBeCloseTo(1, 5);
    });

    it('does NOT echo back to onChange — the form value is preserved across writeValue', () => {
      let echoes = 0;
      accessor.registerOnChange(() => echoes++);
      accessor.writeValue('#0000FF');
      expect(echoes).toBe(0);
    });

    it('does not touch the orthogonal alpha model', () => {
      component.alpha.set(0.5);
      accessor.writeValue('#0000FF');
      expect(component.alpha()).toBe(0.5);
    });

    it('ignores null and empty values', () => {
      const before = component.hs();
      accessor.writeValue(null);
      accessor.writeValue('');
      expect(component.hs()).toBe(before);
    });
  });

  describe('user-driven changes', () => {
    it('onUserHsChange sets hs and fires userChanged', () => {
      let fires = 0;
      component.userChanged.subscribe(() => fires++);
      component.onUserHsChange({ hue: 120, saturation: 1 });
      expect(component.hs()).toEqual({ hue: 120, saturation: 1 });
      expect(fires).toBe(1);
    });

    it('onUserBrightnessChange sets brightness and fires userChanged', () => {
      let fires = 0;
      component.userChanged.subscribe(() => fires++);
      component.onUserBrightnessChange(0.5);
      expect(component.brightness()).toBe(0.5);
      expect(fires).toBe(1);
    });

    it('onUserAlphaChange sets alpha and fires userChanged', () => {
      let fires = 0;
      component.userChanged.subscribe(() => fires++);
      component.onUserAlphaChange(0.3);
      expect(component.alpha()).toBe(0.3);
      expect(fires).toBe(1);
    });
  });

  describe('value accessor emit', () => {
    it('emits hex to onChange on user-driven hs/brightness change', () => {
      const emitted: string[] = [];
      accessor.registerOnChange(hex => emitted.push(hex));
      component.onUserHsChange({ hue: 0, saturation: 1 });
      expect(emitted.length).toBe(1);
      expect(emitted[0].toLowerCase()).toBe('#ff0000');
    });

    it('calls onTouched on user-driven change', () => {
      let touched = 0;
      accessor.registerOnTouched(() => touched++);
      component.onUserBrightnessChange(0.5);
      expect(touched).toBe(1);
    });

    it('alpha changes also fire onTouched (but the emitted hex is still the brightness color)', () => {
      let touched = 0;
      const emitted: string[] = [];
      accessor.registerOnTouched(() => touched++);
      accessor.registerOnChange(hex => emitted.push(hex));
      accessor.writeValue('#FF0000');
      component.onUserAlphaChange(0.3);
      expect(touched).toBe(1);
      expect(emitted.length).toBe(1);
      expect(emitted[0].toLowerCase()).toBe('#ff0000');
    });

    it('round-trips hex through writeValue + immediate user change', () => {
      const emitted: string[] = [];
      accessor.registerOnChange(hex => emitted.push(hex));
      accessor.writeValue('#0000FF');
      // Same color round-trips: drag the wheel back to (240, 1) at brightness 1
      component.onUserHsChange({ hue: 240, saturation: 1 });
      expect(emitted.length).toBe(1);
      expect(emitted[0].toLowerCase()).toBe('#0000ff');
    });
  });
});
