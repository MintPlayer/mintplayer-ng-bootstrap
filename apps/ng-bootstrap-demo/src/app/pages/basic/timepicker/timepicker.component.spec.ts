import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { TimepickerComponent } from './timepicker.component';

@Component({
  selector: 'bs-timepicker',
  template: `<span>Time picker</span>`
})
class BsTimepickerMockComponent {
  @Input() selectedTime = new Date();
}

describe('TimepickerComponent', () => {
  let component: TimepickerComponent;
  let fixture: ComponentFixture<TimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test  
        TimepickerComponent,
      
        // Mock dependencies
        BsTimepickerMockComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
