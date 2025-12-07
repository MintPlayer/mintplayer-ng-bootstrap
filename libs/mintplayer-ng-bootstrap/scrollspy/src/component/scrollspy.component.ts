import { DOCUMENT } from '@angular/common';
import { AfterContentInit, AfterViewInit, Component, ContentChildren, ElementRef, HostListener, Inject, NgZone, QueryList, ViewChildren, signal, effect, untracked } from '@angular/core';
import { BsScrollOffsetService } from '../services/scroll-offset/scroll-offset.service';
import { BsScrollspyDirective } from '../directives/scrollspy.directive';

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  standalone: false,
})
export class BsScrollspyComponent implements AfterViewInit, AfterContentInit {

  constructor(
    private scrollOffsetService: BsScrollOffsetService,
    @Inject(DOCUMENT) document: any,
    private zone: NgZone) {
    this.doc = <Document>document;

    // Effect to handle initialization
    effect(() => {
      const viewInit = this.viewInit();
      const contentInit = this.contentInit();
      if (viewInit && contentInit) {
        untracked(() => {
          this.scrollToCurrentInSpy();
        });
      }
    });
  }

  private viewInit = signal<boolean>(false);
  private contentInit = signal<boolean>(false);

  @ContentChildren(BsScrollspyDirective, { descendants: true }) directives!: QueryList<BsScrollspyDirective>;
  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLSpanElement>>;

  doc: Document;
  activeDirective: BsScrollspyDirective | null = null;

  ngAfterViewInit() {
    this.viewInit.set(true);
  }

  ngAfterContentInit() {
    this.contentInit.set(true);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.setActiveDirective();
    this.scrollToCurrentInSpy();
  }

  setActiveDirective() {
    const offsetY = this.scrollOffsetService.getScrollOffset()[1];
    const dirs = this.directives.filter((d) => d.element.nativeElement.getBoundingClientRect().y < offsetY);

    if (this.directives.length === 0) {
      this.activeDirective = null;
    } else if (dirs.length === 0) {
      this.activeDirective = this.directives.get(0) ?? null;
    } else {
      this.activeDirective = dirs[dirs.length - 1];
    }
  }

  scrollToCurrentInSpy() {
    if ((typeof window !== 'undefined') && (window.innerWidth >= 768)) {
      if (this.activeDirective) {
        const index = this.directives.toArray().findIndex((v, i) => v === this.activeDirective);
        const anchor = this.anchors.get(index);
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
