import { CommonModule } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { FocusOnLoadDirective } from './focus-on-load.directive';

@Component({
  selector: 'focus-on-load-test-component',
  template: `
    <div #wrapper>
      <input type="text" [autofocus] #textbox>
    </div>`
})
class FocusOnLoadTestComponent {
}

describe('FocusOnLoadDirective', () => {
  let fixture: ComponentFixture<FocusOnLoadTestComponent>;
  let des: DebugElement;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        FocusOnLoadDirective,

        // Mock dependencies

        // Testbench
        FocusOnLoadTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FocusOnLoadTestComponent);
    fixture.detectChanges();
    
    // Get test elements
    des = fixture.debugElement.query(By.directive(FocusOnLoadDirective));
  });

  it('should focus the textbox', async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const input = des.nativeElement;
    
    // const focusedElement = des.query(By.css(':focus'));
    const focusedElement = fixture.nativeElement.querySelector(':focus');
    expect(focusedElement).toBeDefined();
    expect(focusedElement).toBe(input);
  });
});