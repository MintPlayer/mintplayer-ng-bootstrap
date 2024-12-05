import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsContextMenuDirective } from './context-menu.directive';

@Component({
  selector: 'context-menu-test-component',
  standalone: false,
  template: `
    <div class="has-custom-context-menu">
      <ul class="dropdown-menu show" *bsContextMenu>
        <li class="dropdown-item cursor-pointer py-1">Item 1</li>
        <li class="dropdown-item cursor-pointer py-1">Item 2</li>
        <li class="dropdown-item cursor-pointer py-1">Item 3</li>
        <li class="dropdown-item cursor-pointer py-1">Item 4</li>
        <li class="dropdown-item cursor-pointer py-1">Item 5</li>
      </ul>
    </div>`
})
class ContextMenuTestComponent {
}

describe('BsContextMenuDirective', () => {
  let fixture: ComponentFixture<ContextMenuTestComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        MockModule(OverlayModule),
      ],
      declarations: [
        // Unit to test
        BsContextMenuDirective,

        // Testbench
        ContextMenuTestComponent
      ]
    })
    .compileComponents();
  });

  it('should create an instance', () => {
    fixture = TestBed.createComponent(ContextMenuTestComponent);
    fixture.detectChanges();
  });
});
