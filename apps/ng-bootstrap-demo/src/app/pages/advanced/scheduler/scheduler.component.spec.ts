import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SchedulerComponent } from './scheduler.component';

interface WeekOptions {
  unitHeight: number
}
interface TimelineOptions {
  unitWidth: number;
}
enum ESchedulerMode {
  week,
  timeline
}
interface Resource {
  description: string;
  events: SchedulerEvent[];
}
interface ResourceGroup {
  description: string;
  children: (ResourceGroup | Resource)[];
}
interface SchedulerEvent {
  start: Date;
  end: Date;
  color: string;
  description: string;
}

@Component({
  selector: 'bs-scheduler',
  template: `<div>Scheduler works</div>`
})
class SchedulerMockComponent {
  @Input() weekOptions: WeekOptions = { unitHeight: 40 };
  @Input() timelineOptions: TimelineOptions = { unitWidth: 60 };
  @Input() mode: ESchedulerMode = ESchedulerMode.week;
  @Input() resources: (Resource | ResourceGroup)[] = [];
}

describe('SchedulerComponent', () => {
  let component: SchedulerComponent;
  let fixture: ComponentFixture<SchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
      ],
      declarations: [
        // Unit to test
        SchedulerComponent,
      
        // Mock dependencies
        SchedulerMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
