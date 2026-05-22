import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSliderComponent } from './slider.component';
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
});
