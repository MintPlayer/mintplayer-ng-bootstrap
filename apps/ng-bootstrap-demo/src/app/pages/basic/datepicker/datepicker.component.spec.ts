import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatepickerTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { DatepickerComponent } from './datepicker.component';

describe('DatepickerComponent', () => {
  let component: DatepickerComponent;
  let fixture: ComponentFixture<DatepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsDatepickerTestingModule,
      ],
      declarations: [
        // Unit to test
        DatepickerComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
