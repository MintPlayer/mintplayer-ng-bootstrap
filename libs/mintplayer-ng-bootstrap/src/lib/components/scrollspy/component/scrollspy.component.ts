import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ContentChildren, ElementRef, HostListener, Inject, OnInit, QueryList } from '@angular/core';
import { BsScrollspyDirective } from '..';

@Component({
  selector: 'bs-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss']
})
export class BsScrollspyComponent implements OnInit, AfterViewInit {

  constructor(@Inject(DOCUMENT) document: any) {
    this.doc = <Document>document;
  }

  @ContentChildren(BsScrollspyDirective, { descendants: true })
  directives!: QueryList<BsScrollspyDirective>;

  doc: Document;
  activeDirective: BsScrollspyDirective | null = null;

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.onWindowScroll();
  }
  
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const dirs = this.directives.filter((d) => d.element.nativeElement.getBoundingClientRect().y <= 0);
    if (this.directives.length === 0) {
      this.activeDirective = null;
    } else if (dirs.length === 0) {
      this.activeDirective = this.directives.get(0) ?? null;
    } else {
      this.activeDirective = dirs[dirs.length - 1];
    }
  }
  
  scrollToHeader(directive: BsScrollspyDirective) {
    const header = directive.element.nativeElement;
    header.scrollIntoView();
  }

}
