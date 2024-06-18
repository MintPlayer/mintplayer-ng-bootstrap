import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRadioButtonComponent } from './radio-button.component';

describe('BsRadioButtonComponent', () => {
  let component: BsRadioButtonComponent;
  let fixture: ComponentFixture<BsRadioButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsRadioButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsRadioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
