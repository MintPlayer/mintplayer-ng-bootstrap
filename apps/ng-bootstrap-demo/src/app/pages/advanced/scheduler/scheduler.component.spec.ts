import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { DatePipe, JsonPipe } from '@angular/common';
import { MockComponent, MockDirective } from 'ng-mocks';
import { SchedulerComponent } from './scheduler.component';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsSelectComponent, BsSelectValueAccessor, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsSchedulerComponent } from '@mintplayer/ng-bootstrap/scheduler';

describe('SchedulerComponent', () => {
  let component: SchedulerComponent;
  let fixture: ComponentFixture<SchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsSchedulerComponent),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsInputGroupComponent),
        MockComponent(BsCardComponent), MockComponent(BsCardHeaderComponent),
        MockComponent(BsSelectComponent), MockDirective(BsSelectValueAccessor), MockDirective(BsSelectOption),
        DatePipe, JsonPipe,

        // Unit to test (standalone)
        SchedulerComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
