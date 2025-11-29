import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsMultiselectModule } from '@mintplayer/ng-bootstrap/multiselect';
import { MockModule } from 'ng-mocks';
import { MultiselectDropdownComponent } from './multiselect-dropdown.component';

describe('MultiselectDropdownComponent', () => {
  let component: MultiselectDropdownComponent;
  let fixture: ComponentFixture<MultiselectDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsFormModule),
        MockModule(BsMultiselectModule),
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
