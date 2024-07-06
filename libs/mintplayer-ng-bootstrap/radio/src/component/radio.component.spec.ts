import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRadioComponent } from './radio.component';

describe('BsRadioComponent', () => {
  let component: BsRadioComponent;
  let fixture: ComponentFixture<BsRadioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsRadioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsRadioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
