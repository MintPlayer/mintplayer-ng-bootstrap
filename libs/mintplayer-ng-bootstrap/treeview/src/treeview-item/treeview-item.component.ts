import { Component, ContentChild, HostListener } from '@angular/core';
import { BsTreeviewComponent } from '../treeview/treeview.component';

@Component({
  selector: 'bs-treeview-item',
  templateUrl: './treeview-item.component.html',
  styleUrls: ['./treeview-item.component.scss'],
})
export class BsTreeviewItemComponent {
  readonly parent: BsTreeviewComponent;
  constructor(parent: BsTreeviewComponent) {
    this.parent = parent;
  }

  @ContentChild(BsTreeviewComponent, { descendants: false }) childTree?: BsTreeviewComponent;

  onClick(ev: MouseEvent) {
    if (this.childTree) {
      this.childTree.isExpanded = !this.childTree.isExpanded;
    }
  }
}
