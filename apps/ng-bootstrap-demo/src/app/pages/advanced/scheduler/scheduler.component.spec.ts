import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsSchedulerModule } from '@mintplayer/ng-bootstrap/scheduler';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { SchedulerComponent } from './scheduler.component';

describe('SchedulerComponent', () => {
  let component: SchedulerComponent;
  let fixture: ComponentFixture<SchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsSchedulerModule),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsInputGroupComponent),
        MockModule(BsSelectModule),

        // Unit to test (standalone)
        SchedulerComponent,
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
