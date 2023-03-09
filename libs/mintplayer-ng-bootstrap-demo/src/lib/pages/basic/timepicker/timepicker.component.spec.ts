import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerModule } from '@mintplayer/ng-bootstrap/timepicker';
import { MockModule } from 'ng-mocks';
import { TimepickerComponent } from './timepicker.component';

describe('TimepickerComponent', () => {
  let component: TimepickerComponent;
  let fixture: ComponentFixture<TimepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsFormModule),
        MockModule(BsGridModule),
        MockModule(BsTimepickerModule),
      ],
      declarations: [
        // Unit to test  
        TimepickerComponent,
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
