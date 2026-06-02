import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import {
  BsTreeSelectComponent,
  BsTreeSelectItemTemplateDirective,
  InMemoryTreeSelectProvider,
  type TreeNode,
  type TreeSelectProvider,
} from '@mintplayer/ng-bootstrap/tree-select';
import { dedent } from 'ts-dedent';

const SAMPLE_TREE: TreeNode[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    children: [
      { id: 'angular', label: 'Angular' },
      { id: 'react', label: 'React' },
      { id: 'vue', label: 'Vue' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    children: [
      { id: 'dotnet', label: '.NET' },
      { id: 'node', label: 'Node.js' },
    ],
  },
];

@Component({
  selector: 'demo-tree-select-drag-drop',
  templateUrl: './tree-select-drag-drop.component.html',
  styleUrls: ['./tree-select-drag-drop.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsFormComponent,
    BsTreeSelectComponent,
    BsTreeSelectItemTemplateDirective,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    DragDropModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectDragDropComponent {

  protected readonly provider: TreeSelectProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE);

  // Each tree-select's selection IS the drop-list's data array. Chips are
  // projected light-DOM (slot="chips") with a cdkDragHandle, and the two lists
  // are connected so chips drag between them.
  protected left: TreeNode[] = [
    { id: 'angular', label: 'Angular' },
    { id: 'react', label: 'React' },
  ];
  protected right: TreeNode[] = [{ id: 'dotnet', label: '.NET' }];

  setLeft(value: TreeNode | TreeNode[] | null) {
    this.left = Array.isArray(value) ? value : value ? [value] : [];
  }
  setRight(value: TreeNode | TreeNode[] | null) {
    this.right = Array.isArray(value) ? value : value ? [value] : [];
  }

  drop(event: CdkDragDrop<TreeNode[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    // New refs so the [(value)] bindings push the reordered/transferred
    // selection back into each tree-select.
    this.left = [...this.left];
    this.right = [...this.right];
  }

  protected readonly snippetHtml = dedent`
    <!-- Two connected drop lists; chips drag between the tree-selects. The chip
         is a custom *bsTreeSelectItem template whose root carries slot="chips"
         + cdkDrag (with a cdkDragHandle). -->
    <div cdkDropList #listA="cdkDropList" [cdkDropListData]="left"
         [cdkDropListConnectedTo]="[listB]" (cdkDropListDropped)="drop($event)"
         cdkDropListOrientation="mixed">
      <bs-tree-select mode="multiple" [provider]="provider"
                      [value]="left" (valueChange)="setLeft($event)">
        <ng-template bsTreeSelectItem let-node let-remove="remove">
          <span slot="chips" cdkDrag class="dnd-chip">
            <span class="dnd-handle" cdkDragHandle>&#9776;</span>
            {{ node.label }}
            <button type="button" (click)="remove()">&times;</button>
          </span>
        </ng-template>
      </bs-tree-select>
    </div>
    <!-- listB mirrors listA, connected back to [listA]. -->
  `;

  protected readonly snippetTs = dedent`
    import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
    import { BsTreeSelectComponent, InMemoryTreeSelectProvider, type TreeNode } from '@mintplayer/ng-bootstrap/tree-select';

    drop(event: CdkDragDrop<TreeNode[]>) {
      if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      } else {
        transferArrayItem(event.previousContainer.data, event.container.data,
          event.previousIndex, event.currentIndex);
      }
      this.left = [...this.left];
      this.right = [...this.right];
    }
  `;
}
