import { AfterViewInit, Component, ViewChild, effect, Injector, runInInjectionContext } from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  standalone: false,
})
export class BsStickyFooterComponent implements AfterViewInit {
  constructor(private parent: BsStickyFooterParentDirective, private injector: Injector) {}

  ngAfterViewInit() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const height = this.sizeObserver.height();
        if (height !== undefined) {
          this.parent.marginBottom = height;
        }
      });
    });
  }

  @ViewChild('sizeObserver') sizeObserver!: BsObserveSizeDirective;
}
