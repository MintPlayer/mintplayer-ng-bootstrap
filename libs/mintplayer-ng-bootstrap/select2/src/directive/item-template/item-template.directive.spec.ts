import { CommonModule } from '@angular/common';
import { Component, DebugElement, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsItemTemplateDirective } from './item-template.directive';
import { BsSelect2Component } from '../../component/select2.component';

@Component({
  selector: 'item-template-test-component',
  standalone: false,
  template: `
    <select2>
      <ng-template itemTemplate>
        <span>item template</span>
      </ng-template>
    </select2>`
})
class BsItemTemplateTestComponent { }

@Component({
  selector: 'select2',
  standalone: true,
})
class MockBsSelect2Component {
  itemTemplate?: TemplateRef<any>;
}

describe('BsItemTemplateDirective', () => {
  let fixture: ComponentFixture<BsItemTemplateTestComponent>;
  let debugElements: DebugElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        // Unit to test
        BsItemTemplateDirective,
        
        // Mock dependencies
        MockBsSelect2Component,
        
        // Testbench
        BsItemTemplateTestComponent,
      ],
      providers: [{
        provide: BsSelect2Component,
        useClass: MockBsSelect2Component
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsItemTemplateTestComponent);

    // Trigger initial binding
    fixture.detectChanges();
    
    // Get all elements with an attached ItemTemplateDirective
    debugElements = fixture.debugElement.queryAll(By.directive(BsItemTemplateDirective));
  });

  it('should be created', () => {
    expect(fixture).toBeTruthy();
  });

  // // Get element test
  // it('should discover 1 element', () => {
  //   expect(debugElements.length).toEqual(1);
  // });

});
