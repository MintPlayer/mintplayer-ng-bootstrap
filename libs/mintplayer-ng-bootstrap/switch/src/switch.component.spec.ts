import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSwitchComponent } from './switch.component';

describe('BsSwitchComponent', () => {
  let component: BsSwitchComponent;
  let fixture: ComponentFixture<BsSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsSwitchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
