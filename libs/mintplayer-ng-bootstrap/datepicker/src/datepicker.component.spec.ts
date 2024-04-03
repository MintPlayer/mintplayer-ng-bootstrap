import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective, MockModule } from 'ng-mocks';
import { BsDatepickerComponent } from './datepicker.component';

describe('BsDatepickerComponent', () => {
  let component: BsDatepickerComponent;
  let fixture: ComponentFixture<BsDatepickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsDropdownModule),
        MockDirective(BsButtonTypeDirective),

        // Unit to test
        BsDatepickerComponent,
      ],
      declarations: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDatepickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
