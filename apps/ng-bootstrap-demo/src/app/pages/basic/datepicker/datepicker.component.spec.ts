import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatepickerComponent } from './datepicker.component';

@Component({
  selector: 'bs-datepicker',
  template: 'Date picker'
})
class BsDatepickerMockComponent {
  
  _selectedDate = new Date();
  @Output() public selectedDateChange = new EventEmitter<Date>();
  get selectedDate() {
    return this._selectedDate;
  }
  @Input() set selectedDate(value: Date) {
    this._selectedDate = value;
    this.selectedDateChange.emit(value);
  }

}

describe('DatepickerComponent', () => {
  let component: DatepickerComponent;
  let fixture: ComponentFixture<DatepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        DatepickerComponent,
      
        // Mock dependencies
        BsDatepickerMockComponent
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
