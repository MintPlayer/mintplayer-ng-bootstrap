import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { MockModule } from 'ng-mocks';

import { BsSelect2Component } from './select2.component';

describe('BsSelect2Component', () => {
  let component: BsSelect2Component<any>;
  let fixture: ComponentFixture<BsSelect2Component<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsHasOverlayModule),
        MockModule(ClickOutsideModule),
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
