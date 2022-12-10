import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnhancedPasteDirective } from './enhanced-paste.directive';

@Component({
  selector: 'enhanced-paste-test',
  template: `<input type="number" [min]="0" [max]="59" (input)="setNumber($event, 59, null)" bsEnhancedPaste [(ngModel)]="minutes" #inputBox>`
})
class EnhancedPasteTestComponent {
  minutes = 0;
  @ViewChild('inputBox') inputBox!: ElementRef<HTMLInputElement>;
  setNumber(event: Event, max: number, nextInput: HTMLInputElement | null) {
  }
}

describe('EnhancedPasteDirective', () => {
  let fixture: ComponentFixture<EnhancedPasteTestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
      ],
      declarations: [
        // Unit to test
        EnhancedPasteDirective,
        
        // Mock dependencies
        
        
        // Testbench
        EnhancedPasteTestComponent,
      ],
      providers: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnhancedPasteTestComponent);

    // Trigger initial binding
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(fixture).toBeTruthy();
  });

  // // Get element test
  // it('should discover 1 element', () => {
  //   expect(debugElements.length).toEqual(1);
  // });

});