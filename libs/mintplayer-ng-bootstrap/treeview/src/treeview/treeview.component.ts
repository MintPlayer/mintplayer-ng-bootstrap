import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BsListGroupComponent } from '@mintplayer/ng-bootstrap/list-group';
import type { BsTreeviewItemComponent } from '../treeview-item/treeview-item.component';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  standalone: true,
  imports: [BsListGroupComponent],
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewComponent {

  private parent = inject(BsTreeviewComponent, { skipSelf: true, optional: true });

  level = computed<number>((): number => !this.parent ? 0 : this.parent.level() + 1);
  indentation = computed(() => this.level() * 30);
  isExpanded = model<boolean>(!this.parent);

  // Roving tabindex: track which item is focused
  private items = signal<BsTreeviewItemComponent[]>([]);
  focusedItem = signal<BsTreeviewItemComponent | null>(null);

  private getRootTree(): BsTreeviewComponent {
    return this.parent ? this.parent.getRootTree() : this;
  }

  registerItem(item: BsTreeviewItemComponent) {
    const root = this.getRootTree();
    root.items.update((items: BsTreeviewItemComponent[]) => [...items, item]);
    // First item gets focus by default
    if (root.focusedItem() === null) {
      root.focusedItem.set(item);
    }
  }

  unregisterItem(item: BsTreeviewItemComponent) {
    const root = this.getRootTree();
    root.items.update((items: BsTreeviewItemComponent[]) => items.filter(i => i !== item));
    if (root.focusedItem() === item) {
      const remaining = root.items();
      root.focusedItem.set(remaining.length > 0 ? remaining[0] : null);
    }
  }

  setFocusedItem(item: BsTreeviewItemComponent) {
    this.getRootTree().focusedItem.set(item);
  }

  isFocusedItem(item: BsTreeviewItemComponent): boolean {
    return this.getRootTree().focusedItem() === item;
  }
}
