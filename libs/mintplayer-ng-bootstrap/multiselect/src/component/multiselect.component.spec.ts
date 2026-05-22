import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective } from 'ng-mocks';
import { BsMultiselectComponent } from './multiselect.component';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';

describe('BsMultiselectComponent', () => {
  let component: BsMultiselectComponent<any>;
  let fixture: ComponentFixture<BsMultiselectComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockDirective(BsButtonTypeDirective),
        // Unit to test
        BsMultiselectComponent,
      ],
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
