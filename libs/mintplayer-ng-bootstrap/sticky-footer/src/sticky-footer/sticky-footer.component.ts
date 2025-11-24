import { Component, ViewChild, effect, inject } from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  imports: [BsObserveSizeDirective]
})
export class BsStickyFooterComponent {
  constructor() {
    effect(() => {
      const height = this.sizeObserver?.height();
      console.log('footer height changed to', height);
      debugger;
      if (height !== undefined) {
        setTimeout(() => {
          this.parent.marginBottom = height;
        }, 5);
      }
    });
  }

  @ViewChild('sizeObserver') sizeObserver?: BsObserveSizeDirective;
  parent = inject(BsStickyFooterParentDirective);
}
