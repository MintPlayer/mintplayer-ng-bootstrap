import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsDropdownDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { BsTypeaheadComponent } from './typeahead.component';


describe('TypeaheadComponent', () => {
  let component: BsTypeaheadComponent;
  let fixture: ComponentFixture<BsTypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsHasOverlayComponent),
      ],
      declarations: [
        // Unit to test
        BsTypeaheadComponent,
      
        // Mock dependencies
        MockDirective(ClickOutsideDirective),
        MockDirective(BsDropdownMenuDirective),
        MockDirective(BsDropdownDirective),
        MockComponent(BsFormComponent),
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
