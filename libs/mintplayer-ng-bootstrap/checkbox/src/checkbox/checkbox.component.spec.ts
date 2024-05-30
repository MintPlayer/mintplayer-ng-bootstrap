import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCheckboxComponent } from './checkbox.component';

describe('BsCheckboxComponent', () => {
  let component: BsCheckboxComponent;
  let fixture: ComponentFixture<BsCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsCheckboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
