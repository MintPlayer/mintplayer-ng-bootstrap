import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormCheckComponent } from './form-check.component';

describe('BsFormCheckComponent', () => {
  let component: BsFormCheckComponent;
  let fixture: ComponentFixture<BsFormCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsFormCheckComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsFormCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
