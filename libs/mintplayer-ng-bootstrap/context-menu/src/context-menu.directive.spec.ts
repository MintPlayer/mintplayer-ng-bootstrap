import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsContextMenuDirective } from './context-menu.directive';

@Injectable({ providedIn: 'root' })
class OverlayMock { }

@Component({
  selector: 'context-menu-test-component',
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
        CommonModule
      ],
      providers: [{
        provide: Overlay,
        useClass: OverlayMock
      }],
      declarations: [
        // Unit to test
        BsContextMenuDirective,

        // Mock dependencies

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
