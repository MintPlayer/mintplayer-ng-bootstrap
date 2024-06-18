import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRadioToggleButtonComponent } from './radio-toggle-button.component';

describe('BsRadioToggleButtonComponent', () => {
  let component: BsRadioToggleButtonComponent;
  let fixture: ComponentFixture<BsRadioToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsRadioToggleButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsRadioToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
