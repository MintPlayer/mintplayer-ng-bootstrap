import { AfterViewInit, Component, effect, Injector, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'bs-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsStickyFooterComponent implements AfterViewInit {
  constructor(
    private parent: BsStickyFooterParentDirective,
    private injector: Injector
  ) {}

  ngAfterViewInit() {
    effect(() => {
      const height = this.sizeObserver().height();
      if (height !== undefined) {
        this.parent.marginBottom = height;
      }
    }, { injector: this.injector });
  }

  readonly sizeObserver = viewChild.required<BsObserveSizeDirective>('sizeObserver');
}
