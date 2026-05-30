import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import {
  BsTreeSelectComponent,
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
  imports: [BsCodeSnippetComponent, BsFormComponent, BsTreeSelectComponent, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectDragDropComponent {

  protected readonly provider: TreeSelectProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE);
  protected readonly selected = signal<TreeNode[]>([]);

  onValueChange(value: TreeNode | TreeNode[] | null) {
    this.selected.set(Array.isArray(value) ? value : value ? [value] : []);
  }

  onDrop(event: CdkDragDrop<TreeNode[]>) {
    const items = [...this.selected()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    // Push the new order back — the tree-select chips re-render in this order.
    this.selected.set(items);
  }

  remove(node: TreeNode) {
    this.selected.set(this.selected().filter((n) => n.id !== node.id));
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-tree-select
        mode="multiple"
        [provider]="provider"
        [value]="selected()"
        (valueChange)="onValueChange($event)"
        placeholder="Pick technologies">
      </bs-tree-select>
    </bs-form>

    <!-- Reorder the selection with CDK drag-drop; the new order flows back. -->
    <div cdkDropList cdkDropListOrientation="mixed"
         (cdkDropListDropped)="onDrop($event)" class="dnd-list">
      @for (item of selected(); track item.id) {
        <span cdkDrag class="dnd-chip">
          <span class="drag-handle">&#9776;</span>
          {{ item.label }}
          <button type="button" (click)="remove(item)" aria-label="Remove">&times;</button>
        </span>
      }
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
    import {
      BsTreeSelectComponent,
      InMemoryTreeSelectProvider,
      type TreeNode,
      type TreeSelectProvider,
    } from '@mintplayer/ng-bootstrap/tree-select';
    import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

    @Component({
      selector: 'my-tree-select-drag-drop-demo',
      templateUrl: './my-tree-select-drag-drop-demo.component.html',
      imports: [BsFormComponent, BsTreeSelectComponent, DragDropModule],
    })
    export class MyTreeSelectDragDropDemoComponent {
      protected readonly provider: TreeSelectProvider = new InMemoryTreeSelectProvider(MY_TREE);
      protected readonly selected = signal<TreeNode[]>([]);

      onValueChange(value: TreeNode | TreeNode[] | null) {
        this.selected.set(Array.isArray(value) ? value : value ? [value] : []);
      }

      onDrop(event: CdkDragDrop<TreeNode[]>) {
        const items = [...this.selected()];
        moveItemInArray(items, event.previousIndex, event.currentIndex);
        this.selected.set(items);
      }
    }
  `;
}
