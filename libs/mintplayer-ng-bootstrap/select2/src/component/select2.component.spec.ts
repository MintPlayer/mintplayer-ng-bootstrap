import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { BsSelect2Component } from './select2.component';

describe('BsSelect2Component', () => {
  let component: BsSelect2Component<any, number>;
  let fixture: ComponentFixture<BsSelect2Component<any, number>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsHasOverlayComponent),
        MockDirective(ClickOutsideDirective),
        MockModule(BsDropdownModule),
      ],
      declarations: [
        // Unit to test
        BsSelect2Component,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsSelect2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
