import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { MockDirective, MockModule } from 'ng-mocks';
import { BsMultiselectComponent } from './multiselect.component';

describe('BsMultiselectComponent', () => {
  let component: BsMultiselectComponent<any>;
  let fixture: ComponentFixture<BsMultiselectComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsDropdownModule),
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [
        // Unit to test
        BsMultiselectComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsMultiselectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
