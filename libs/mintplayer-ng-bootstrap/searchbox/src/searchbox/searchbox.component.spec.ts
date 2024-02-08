import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule, MockPipe } from 'ng-mocks';
import { Component } from '@angular/core';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsIconPipe } from '@mintplayer/ng-bootstrap/icon';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsSearchboxComponent } from './searchbox.component';

interface Item {
  id: number;
}

@Component({
  selector: 'searchbox-test',
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

        // Mock dependencies
        MockPipe(BsIconPipe),

        // Testbench
        BsSearchboxTestComponent,
      ],
      imports: [
        MockModule(BsFormModule),
        MockModule(BsDropdownModule),
        MockModule(BsButtonTypeModule),
        MockModule(BsDropdownMenuModule),
        MockModule(BsHasOverlayModule),
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
