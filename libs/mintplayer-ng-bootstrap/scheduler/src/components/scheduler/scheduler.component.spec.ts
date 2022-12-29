import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { MockModule } from 'ng-mocks';

import { BsSchedulerComponent } from './scheduler.component';

describe('BsSchedulerComponent', () => {
  let component: BsSchedulerComponent;
  let fixture: ComponentFixture<BsSchedulerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsIconModule),
      ],
      declarations: [ BsSchedulerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsSchedulerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
