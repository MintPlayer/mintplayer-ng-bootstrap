import { Component, ViewChild, effect, inject, signal } from '@angular/core';
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
      const height = this.sizeObserverRef()?.height();
      console.log('footer height changed to', height);
      debugger;
      if (height !== undefined) {
        setTimeout(() => {
          this.parent.marginBottom = height;
        }, 5);
      }
    });
  }

  private sizeObserverRef = signal<BsObserveSizeDirective | undefined>(undefined);

  @ViewChild('sizeObserver') set sizeObserver(dir: BsObserveSizeDirective | undefined) {
    this.sizeObserverRef.set(dir);
  }

  parent = inject(BsStickyFooterParentDirective);
}
