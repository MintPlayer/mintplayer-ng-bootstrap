import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsOrdinalNumberPipe } from './ordinal-number.pipe';

@Component({
  selector: 'ordinal-number-test',
  template: `<span id="number-span" [innerHtml]="text | ordinalNumber: 'st'"></span>`
})
class OrdinalNumberTestComponent {
  text = 'This is the 1st test';
}

describe('BsOrdinalNumberPipe', () => {
  let component: OrdinalNumberTestComponent;
  let fixture: ComponentFixture<OrdinalNumberTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsOrdinalNumberPipe,

        // Testbench
        OrdinalNumberTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OrdinalNumberTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the correct html', () => {
    const spanDebugElement = fixture.debugElement.queryAll(By.css('#number-span'));
    const spanElement = spanDebugElement[0].nativeElement
    expect(spanElement.innerHTML).toBe('This is the 1<sup>st</sup> test');
  });

});
