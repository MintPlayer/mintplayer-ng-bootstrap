import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UcFirstTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { BsCalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        UcFirstTestingModule
      ],
      declarations: [
        BsCalendarComponent,
        MonthNameMockPipe,
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

@Pipe({
  name: 'monthName'
})
class MonthNameMockPipe implements PipeTransform {

  transform(date: Date, ...args: any[]) {
    return date.toLocaleString("default", { month: 'long' });
  }

}
