import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { Component } from '@angular/core';
import { BsStickyFooterComponent } from './sticky-footer.component';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';

@Component({
  selector: 'sticky-footer-test',
  template: `
    <div bsStickyFooterParent>
      <bs-sticky-footer>
        Content
      </bs-sticky-footer>
    </div>`
})
class BsStickyFooterTestComponent {
}

describe('BsStickyFooterComponent', () => {
  let component: BsStickyFooterTestComponent;
  let fixture: ComponentFixture<BsStickyFooterTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit test
        BsStickyFooterComponent,
      
        // Mock dependencies
        MockDirective(BsStickyFooterParentDirective),

        // Testbench
        BsStickyFooterTestComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsStickyFooterTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
