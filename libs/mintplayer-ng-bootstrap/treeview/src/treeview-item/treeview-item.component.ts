/// <reference types="../types" />

import { ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, inject, signal } from '@angular/core';
import { BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsTreeviewComponent } from '../treeview/treeview.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-treeview-item',
  templateUrl: './treeview-item.component.html',
  styleUrls: ['./treeview-item.component.scss'],
  imports: [BsListGroupItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewItemComponent {

  readonly parent = inject(BsTreeviewComponent);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  readonly childTree = contentChild(BsTreeviewComponent, { descendants: false });
  chevronRight = signal<SafeHtml | undefined>(undefined);

  // Roving tabindex: only the focused item has tabindex 0
  tabIndex = computed(() => this.parent.isFocusedItem(this) ? 0 : -1);

  constructor() {
    import('bootstrap-icons/icons/chevron-right.svg').then((icon) => {
      this.chevronRight.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });

    // Register this item with the tree
    this.parent.registerItem(this);
    this.destroyRef.onDestroy(() => {
      this.parent.unregisterItem(this);
    });
  }

  onClick(ev: MouseEvent) {
    // Set this item as focused when clicked
    this.parent.setFocusedItem(this);

    const childTree = this.childTree();
    if (childTree) {
      childTree.isExpanded.update(v => !v);
    }
  }
}
