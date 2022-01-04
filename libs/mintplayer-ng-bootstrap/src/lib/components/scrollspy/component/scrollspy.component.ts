import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ContentChildren, ElementRef, HostListener, Inject, QueryList, ViewChildren } from '@angular/core';
import { BsScrollOffsetService } from '../../../services/scroll-offset/scroll-offset.service';
import { BsScrollspyDirective } from '../directives/scrollspy.directive';

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss']
})
export class BsScrollspyComponent implements AfterViewInit {

  constructor(
    private scrollOffsetService: BsScrollOffsetService,
    @Inject(DOCUMENT) document: any) {
    this.doc = <Document>document;
  }

  @ContentChildren(BsScrollspyDirective, { descendants: true }) directives!: QueryList<BsScrollspyDirective>;
  @ViewChildren('anchor') anchors!: QueryList<ElementRef<HTMLSpanElement>>;

  doc: Document;
  activeDirective: BsScrollspyDirective | null = null;

  ngAfterViewInit() {
    this.onWindowScroll();
  }
  
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const offsetY = this.scrollOffsetService.getScrollOffset()[1];
    const dirs = this.directives.filter((d) => d.element.nativeElement.getBoundingClientRect().y < offsetY);
    if (this.directives.length === 0) {
      this.activeDirective = null;
    } else if (dirs.length === 0) {
      this.activeDirective = this.directives.get(0) ?? null;
    } else {
      this.activeDirective = dirs[dirs.length - 1];
    }

    if (window && (window.innerWidth >= 768)) {
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
    const header = directive.element.nativeElement;
    const offsetY = this.scrollOffsetService.getScrollOffset()[1];
    const y = header.getBoundingClientRect().top + window.scrollY - offsetY + 1;
    window.scrollTo({top: y, behavior: 'smooth'});
  }

}
