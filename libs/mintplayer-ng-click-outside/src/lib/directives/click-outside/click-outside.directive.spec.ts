import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  selector: 'click-outside-test-component',
  template: `
    <div #wrapper>
      <div #div (clickOutside)="increment()">
        Text
      </div>
    </div>`
})
class ClickOutsideTestComponent {
  counter = 0;
  @ViewChild('div') div!: ElementRef<HTMLDivElement>;
  @ViewChild('wrapper') wrapper!: ElementRef<HTMLDivElement>;

  increment() {
    this.counter++;
  }
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<ClickOutsideTestComponent>;
  let div: ElementRef<HTMLDivElement>;
  let wrapper: ElementRef<HTMLDivElement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        ClickOutsideDirective,

        // Mock dependencies

        // Testbench
        ClickOutsideTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClickOutsideTestComponent);

    // Get test elements
    div = fixture.componentInstance.div;
    wrapper = fixture.componentInstance.wrapper;

    fixture.detectChanges();
  });
  
  it('should react only if clicked outside the element', () => {
    expect(fixture.componentInstance.counter).toBe(0);
    
    // Now simulate a click inside the element
    fixture.componentInstance.div.nativeElement.click();
    expect(fixture.componentInstance.counter).toBe(0);

    // Now simulate a click outside the element
    fixture.componentInstance.wrapper.nativeElement.click();
    expect(fixture.componentInstance.counter).toBe(1);

    // Now simulate a click inside the element
    fixture.componentInstance.div.nativeElement.click();
    expect(fixture.componentInstance.counter).toBe(1);
  });
  
});