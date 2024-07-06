import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToggleButtonComponent } from './toggle-button.component';

describe('BsToggleButtonComponent', () => {
  let component: BsToggleButtonComponent;
  let fixture: ComponentFixture<BsToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsToggleButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
