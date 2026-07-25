import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import {
  BsTreeSelectComponent,
  InMemoryTreeSelectProvider,
  type TreeNode,
  type TreeSelectProvider,
} from '@mintplayer/ng-bootstrap/tree-select';
import { BsTreeSelectReorderDirective } from '@mintplayer/ng-bootstrap/tree-select/reorder';
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
  imports: [BsCodeSnippetComponent, BsFormComponent, BsTreeSelectComponent, BsTreeSelectReorderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectDragDropComponent {
  protected readonly provider: TreeSelectProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE);
  protected readonly selected = signal<TreeNode[]>([]);
  protected readonly orderLabels = computed(() => this.selected().map((n) => n.label).join(' → '));

  // value-change fires for selection AND reorder, so this stays in sync with the
  // chip order shown inside the component.
  onValueChange(value: TreeNode | TreeNode[] | null) {
    this.selected.set(Array.isArray(value) ? value : value ? [value] : []);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-tree-select
        mode="multiple"
        reorderable
        [provider]="provider"
        [value]="selected()"
        (valueChange)="onValueChange($event)"
        placeholder="Pick technologies">
      </bs-tree-select>
    </bs-form>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsTreeSelectComponent,
      InMemoryTreeSelectProvider,
      type TreeNode,
      type TreeSelectProvider,
    } from '@mintplayer/ng-bootstrap/tree-select';
    // Opt-in: importing this directive pulls in the drag-drop code and makes
    // \`reorderable\` live. Omit it and the reorder code is tree-shaken away.
    import { BsTreeSelectReorderDirective } from '@mintplayer/ng-bootstrap/tree-select/reorder';
    import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

    @Component({
      selector: 'my-tree-select-drag-drop-demo',
      templateUrl: './my-tree-select-drag-drop-demo.component.html',
      imports: [BsFormComponent, BsTreeSelectComponent, BsTreeSelectReorderDirective],
    })
    export class MyTreeSelectDragDropDemoComponent {
      protected readonly provider: TreeSelectProvider = new InMemoryTreeSelectProvider(MY_TREE);
      protected readonly selected = signal<TreeNode[]>([]);

      // Reordering chips emits value-change with the new order, so the form
      // value (and [(ngModel)] / formControl) updates automatically.
      onValueChange(value: TreeNode | TreeNode[] | null) {
        this.selected.set(Array.isArray(value) ? value : value ? [value] : []);
      }
    }
  `;
}
