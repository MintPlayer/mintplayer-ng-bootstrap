import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { MockModule } from 'ng-mocks';
import { BsMultiselectComponent } from './multiselect.component';

describe('BsMultiselectComponent', () => {
  let component: BsMultiselectComponent;
  let fixture: ComponentFixture<BsMultiselectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsDropdownModule),
        MockModule(BsButtonTypeModule),
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
