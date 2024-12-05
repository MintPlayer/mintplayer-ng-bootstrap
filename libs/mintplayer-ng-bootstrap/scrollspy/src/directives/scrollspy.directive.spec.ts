import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsScrollspyComponent } from '../component/scrollspy.component';
import { BsScrollspyDirective } from './scrollspy.directive';

@Component({
  selector: 'bs-scrollspy-test',
  standalone: false,
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

describe('BsScrollspyDirective', () => {
  let component: BsScrollspyTestComponent;
  let fixture: ComponentFixture<BsScrollspyTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsScrollspyDirective,

        // Mock dependencies
        MockComponent(BsScrollspyComponent),

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
