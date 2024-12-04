import { CommonModule } from '@angular/common';
import { Component, DebugElement, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsSuggestionTemplateDirective } from './suggestion-template.directive';
import { BsSelect2Component } from '../../component/select2.component';

@Component({
  selector: 'item-template-test-component',
  standalone: false,
  template: `
    <select2>
      <span *bsSuggestionTemplate>Suggestion template</span>
    </select2>`
})
class BsSuggestionTemplateTestComponent { }

@Component({
  selector: 'select2'
})
class MockBsSelect2Component {
  itemTemplate?: TemplateRef<any>;
}

describe('BsSuggestionTemplateDirective', () => {
  let fixture: ComponentFixture<BsSuggestionTemplateTestComponent>;
  let debugElements: DebugElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        BsSuggestionTemplateDirective,
        
        // Mock dependencies
        MockBsSelect2Component,
        
        // Testbench
        BsSuggestionTemplateTestComponent,
      ],
      providers: [{
        provide: BsSelect2Component,
        useClass: MockBsSelect2Component
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsSuggestionTemplateTestComponent);

    // Trigger initial binding
    fixture.detectChanges();
    
    // Get all elements with an attached ItemTemplateDirective
    debugElements = fixture.debugElement.queryAll(By.directive(BsSuggestionTemplateDirective));
  });

  it('should be created', () => {
    expect(fixture).toBeTruthy();
  });

  // // Get element test
  // it('should discover 1 element', () => {
  //   expect(debugElements.length).toEqual(1);
  // });

});
