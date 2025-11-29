import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsOverlayComponent } from '@mintplayer/ng-bootstrap/overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

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
        MockModule(BsFormModule),
        MockModule(BsDropdownModule),
        MockComponent(BsOverlayComponent),
        MockDirective(ClickOutsideDirective),
      ],
      declarations: [],
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
