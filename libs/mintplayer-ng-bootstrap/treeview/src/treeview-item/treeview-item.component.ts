/// <reference types="../types" />

import { Component, ContentChild, HostListener, inject } from '@angular/core';
import { BsTreeviewComponent } from '../treeview/treeview.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-treeview-item',
  templateUrl: './treeview-item.component.html',
  styleUrls: ['./treeview-item.component.scss'],
  standalone: false,
})
export class BsTreeviewItemComponent {
  readonly parent = inject(BsTreeviewComponent);
  readonly sanitizer = inject(DomSanitizer);
  constructor() {
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  @ContentChild(BsTreeviewComponent, { descendants: false }) childTree?: BsTreeviewComponent;
  chevronRight?: SafeHtml;

  onClick(ev: MouseEvent) {
    if (this.childTree) {
      this.childTree.isExpanded = !this.childTree.isExpanded;
    }
  }
}
