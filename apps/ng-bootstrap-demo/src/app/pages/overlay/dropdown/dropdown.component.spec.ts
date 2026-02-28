import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective } from 'ng-mocks';

import { DropdownComponent } from './dropdown.component';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockDirective(BsButtonTypeDirective),
        DropdownComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
