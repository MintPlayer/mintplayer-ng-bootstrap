import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsUcFirstModule } from '@mintplayer/ng-bootstrap/uc-first';
import { MonthNamePipe } from '@mintplayer/ng-bootstrap/calendar-month';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { MockModule, MockPipe } from 'ng-mocks';

import { BsCalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsIconModule),
        MockModule(BsUcFirstModule),
      ],
      declarations: [
        BsCalendarComponent,
        MockPipe(MonthNamePipe),
      ]
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
