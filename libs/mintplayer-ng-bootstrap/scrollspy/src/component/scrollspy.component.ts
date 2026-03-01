import { DOCUMENT } from '@angular/common';
import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, Component, contentChildren, effect, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { BsScrollOffsetService } from '../services/scroll-offset/scroll-offset.service';
import { BsScrollspyDirective } from '../directives/scrollspy.directive';

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onWindowScroll()',
  },
})
export class BsScrollspyComponent implements AfterViewInit, AfterContentInit {

  private scrollOffsetService = inject(BsScrollOffsetService);
  doc = inject<Document>(DOCUMENT);

  private viewInit = signal<boolean>(false);
  private contentInit = signal<boolean>(false);

  readonly directives = contentChildren(BsScrollspyDirective, { descendants: true });
  readonly anchors = viewChildren<ElementRef<HTMLSpanElement>>('anchor');

  activeDirective = signal<BsScrollspyDirective | null>(null);

  constructor() {
    effect(() => {
      const viewInit = this.viewInit();
      const contentInit = this.contentInit();
      if (viewInit && contentInit) {
        this.scrollToCurrentInSpy();
      }
    });
  }

  ngAfterViewInit() {
    this.viewInit.set(true);
  }

  ngAfterContentInit() {
    this.contentInit.set(true);
  }

  onWindowScroll() {
    this.setActiveDirective();
    this.scrollToCurrentInSpy();
  }

  setActiveDirective() {
    const offsetY = this.scrollOffsetService.getScrollOffset()[1];
    const allDirectives = this.directives();
    const dirs = allDirectives.filter((d) => d.element.nativeElement.getBoundingClientRect().y < offsetY);

    if (allDirectives.length === 0) {
      this.activeDirective.set(null);
    } else if (dirs.length === 0) {
      this.activeDirective.set(allDirectives[0] ?? null);
    } else {
      this.activeDirective.set(dirs[dirs.length - 1]);
    }
  }

  scrollToCurrentInSpy() {
    if ((typeof window !== 'undefined') && (window.innerWidth >= 768)) {
      if (this.activeDirective()) {
        const index = this.directives().findIndex((v, i) => v === this.activeDirective());
        const anchor = this.anchors()[index];
        if (anchor && anchor.nativeElement.parentElement) {
          anchor.nativeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    }
  }

  scrollToHeader(directive: BsScrollspyDirective) {
    if (typeof window !== 'undefined') {
      const header = directive.element.nativeElement;
      const offsetY = this.scrollOffsetService.getScrollOffset()[1];
      const y = header.getBoundingClientRect().top + window.scrollY - offsetY + 1;
      window.scrollTo({top: y, behavior: 'smooth'});
    }
  }
}
