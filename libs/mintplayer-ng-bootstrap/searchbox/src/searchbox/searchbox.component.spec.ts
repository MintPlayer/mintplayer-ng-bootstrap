import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective } from 'ng-mocks';
import { Component } from '@angular/core';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsSearchboxComponent } from './searchbox.component';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

interface Item {
  id: number;
}

@Component({
  selector: 'searchbox-test',
  standalone: true,
  template: `
    <bs-form>
      <bs-searchbox [suggestions]="suggestions"></bs-searchbox>
    </bs-form>`
})
class BsSearchboxTestComponent {
  suggestions: Item[] = [];
}

describe('BsSearchboxComponent', () => {
  let component: BsSearchboxTestComponent;
  let fixture: ComponentFixture<BsSearchboxTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsDropdownMenuComponent), MockComponent(BsDropdownItemComponent),
        MockComponent(BsHasOverlayComponent),
        // Unit to test
        BsSearchboxComponent,

        // Testbench
        BsSearchboxTestComponent,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsSearchboxTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
