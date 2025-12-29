/// <reference types="../types" />

import { ChangeDetectionStrategy, Component, computed, ContentChild, DestroyRef, inject, signal } from '@angular/core';
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
  private destroyRef = inject(DestroyRef);

  @ContentChild(BsTreeviewComponent, { descendants: false }) childTree?: BsTreeviewComponent;
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

    if (this.childTree) {
      this.childTree.isExpanded.update(v => !v);
    }
  }
}
