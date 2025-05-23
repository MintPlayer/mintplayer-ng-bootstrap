import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { Component } from '@angular/core';
import { BsStickyFooterComponent } from './sticky-footer.component';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'sticky-footer-test',
  standalone: false,
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
      imports: [
        MockDirective(BsObserveSizeDirective),
      ],
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
