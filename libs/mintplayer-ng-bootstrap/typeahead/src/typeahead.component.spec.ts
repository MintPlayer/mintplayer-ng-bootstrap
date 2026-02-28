import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsTypeaheadComponent } from './typeahead.component';


describe('TypeaheadComponent', () => {
  let component: BsTypeaheadComponent;
  let fixture: ComponentFixture<BsTypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsTypeaheadComponent,

        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockComponent(BsHasOverlayComponent),
        MockDirective(ClickOutsideDirective),
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTypeaheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
