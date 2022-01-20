import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullcalendarComponent } from './fullcalendar.component';

describe('FullcalendarComponent', () => {
  let component: FullcalendarComponent;
  let fixture: ComponentFixture<FullcalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FullcalendarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FullcalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
