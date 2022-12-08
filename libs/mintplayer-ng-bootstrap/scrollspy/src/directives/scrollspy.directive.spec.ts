import { Component, ContentChildren, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsScrollspyDirective } from './scrollspy.directive';

@Component({
  selector: 'bs-scrollspy-test',
  template: `
    <bs-scrollspy>
      <h1 bsScrollspy>Main title</h1>
      <h2 bsScrollspy>Subtitle 1</h2>
      <div class="w-100">
        Container 1
      </div>
      <h2 bsScrollspy>Subtitle 2</h2>
      <div class="w-100">
        Container 2
      </div>
      <h2 bsScrollspy>Subtitle 3</h2>
      <div class="w-100">
        Container 3
      </div>
      <h2 bsScrollspy>Subtitle 4</h2>
      <div class="w-100">
        Container 4
      </div>
    </bs-scrollspy>`
})
class BsScrollspyTestComponent {
}

@Component({
  selector: 'bs-scrollspy',
  template: `
    <ul>
      <li *ngFor="let dir of directives">
        {{ dir.element.nativeElement.textContent }}
      </li>
    </ul>
    <div class="content">
      <ng-content></ng-content>
    </div>`
})
class BsScrollspyMockComponent {

  @ContentChildren(BsScrollspyDirective, { descendants: true })
  directives!: QueryList<BsScrollspyDirective>;

}

describe('BsScrollspyDirective', () => {
  let component: BsScrollspyTestComponent;
  let fixture: ComponentFixture<BsScrollspyTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsScrollspyDirective,

        // Mock components
        BsScrollspyMockComponent,

        // Testbench
        BsScrollspyTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsScrollspyTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
