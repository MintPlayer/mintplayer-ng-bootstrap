import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { Component } from '@angular/core';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsSearchboxComponent } from './searchbox.component';

interface Item {
  id: number;
}

@Component({
  selector: 'searchbox-test',
  standalone: false,
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
      declarations: [
        // Unit to test
        BsSearchboxComponent,

        // Testbench
        BsSearchboxTestComponent,
      ],
      imports: [
        MockModule(BsFormModule),
        MockModule(BsDropdownModule),
        MockDirective(BsButtonTypeDirective),
        MockModule(BsDropdownMenuModule),
        MockComponent(BsHasOverlayComponent),
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
