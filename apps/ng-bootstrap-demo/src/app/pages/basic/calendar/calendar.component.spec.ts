import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCalendarModule } from '@mintplayer/ng-bootstrap/calendar';
import { MockModule } from 'ng-mocks';
import { CalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let component: CalendarComponent;
  let fixture: ComponentFixture<CalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsCalendarModule),
      ],
      declarations: [
        // Unit to test
        CalendarComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
