import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { MultiselectDropdownComponent } from './multiselect-dropdown.component';

describe('MultiselectDropdownComponent', () => {
  let component: MultiselectDropdownComponent;
  let fixture: ComponentFixture<MultiselectDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsMultiselectTestingModule,
      ],
      declarations: [
        // Unit to test
        MultiselectDropdownComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiselectDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
