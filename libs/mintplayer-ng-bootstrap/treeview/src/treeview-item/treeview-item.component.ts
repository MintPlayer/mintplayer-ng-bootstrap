/// <reference types="../types" />

import { ChangeDetectionStrategy, Component, ContentChild, inject, signal } from '@angular/core';
import { BsTreeviewComponent } from '../treeview/treeview.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-treeview-item',
  templateUrl: './treeview-item.component.html',
  styleUrls: ['./treeview-item.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewItemComponent {

  readonly parent = inject(BsTreeviewComponent);
  private sanitizer = inject(DomSanitizer);

  @ContentChild(BsTreeviewComponent, { descendants: false }) childTree?: BsTreeviewComponent;
  chevronRight = signal<SafeHtml | undefined>(undefined);

  constructor() {
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  onClick(ev: MouseEvent) {
    if (this.childTree) {
      this.childTree.isExpanded.update(v => !v);
    }
  }
}
