import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';
import { BsMonthNamePipe } from '@mintplayer/ng-bootstrap/calendar-month';
import { MockPipe } from 'ng-mocks';

import { BsCalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockPipe(BsUcFirstPipe),
        MockPipe(BsMonthNamePipe),

        // Unit to test
        BsCalendarComponent,
      ],
      declarations: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
