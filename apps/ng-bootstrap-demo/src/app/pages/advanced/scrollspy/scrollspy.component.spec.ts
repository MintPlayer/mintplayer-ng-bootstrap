import { Component, ContentChildren, Directive, ElementRef, Input, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollspyComponent } from './scrollspy.component';

@Directive({
  selector: '[bsScrollspy]'
})
class BsScrollspyMockDirective {
  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;
}

@Component({
  selector: 'bs-scrollspy',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsScrollspyMockComponent {
  @Input() animation: 'slide' | 'fade' = 'slide';

  @ContentChildren(BsScrollspyMockDirective, { descendants: true })
  directives!: QueryList<BsScrollspyMockDirective>;
}

describe('ScrollspyComponent', () => {
  let component: ScrollspyComponent;
  let fixture: ComponentFixture<ScrollspyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ScrollspyComponent,
      
        // Mock dependencies
        BsScrollspyMockDirective,
        BsScrollspyMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScrollspyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
