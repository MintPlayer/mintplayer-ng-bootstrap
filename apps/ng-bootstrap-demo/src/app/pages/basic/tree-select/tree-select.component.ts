import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import {
  BsTreeSelectComponent,
  BsTreeSelectItemTemplateDirective,
  BsTreeSelectSuggestionTemplateDirective,
  InMemoryTreeSelectProvider,
  type TreeNode,
} from '@mintplayer/ng-bootstrap/tree-select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
import { TreeSelectHttpProvider } from '../../../services/tree-select/tree-select-http-provider';

type Value = TreeNode | TreeNode[] | null;

const SAMPLE_TREE: TreeNode[] = [
  {
    id: 'fruit',
    label: 'Fruit',
    children: [
      { id: 'apple', label: 'Apple' },
      { id: 'banana', label: 'Banana' },
      {
        id: 'citrus',
        label: 'Citrus',
        children: [
          { id: 'orange', label: 'Orange' },
          { id: 'lemon', label: 'Lemon' },
        ],
      },
    ],
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    children: [
      { id: 'carrot', label: 'Carrot' },
      { id: 'potato', label: 'Potato' },
    ],
  },
];

@Component({
  selector: 'demo-tree-select',
  templateUrl: './tree-select.component.html',
  styleUrls: ['./tree-select.component.scss'],
  imports: [
    FormsModule,
    BsCodeSnippetComponent,
    BsFormComponent,
    BsTreeSelectComponent,
    BsTreeSelectItemTemplateDirective,
    BsTreeSelectSuggestionTemplateDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectComponent {
  // 5. Custom templates: a bsTreeSelectItem chip + a bsTreeSelectSuggestion row.
  protected readonly templatesValue = signal<Value>([]);
  // 1. Single select with server search — hits the real /api/treeItems backend.
  protected readonly httpProvider = inject(TreeSelectHttpProvider);
  protected readonly singleValue = signal<Value>(null);

  // 2/3/4. In-memory providers (no backend needed).
  protected readonly memoryProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE, { pageSize: 50 });
  protected readonly multipleValue = signal<Value>([]);
  protected readonly checkboxValue = signal<Value>([]);
  protected readonly buttonValue = signal<Value>(null);

  protected readonly snippetSingleHtml = dedent`
    <bs-form>
      <bs-tree-select
        [provider]="httpProvider"
        placeholder="Search the org tree…"
        [(value)]="singleValue">
      </bs-tree-select>
    </bs-form>
  `;

  protected readonly snippetSingleTs = dedent`
    import { inject, Injectable } from '@angular/core';
    import { HttpClient, HttpParams } from '@angular/common/http';
    import { firstValueFrom } from 'rxjs';
    import {
      NodePage, NodeRequest, TreeNode, TreeSelectProvider,
    } from '@mintplayer/ng-bootstrap/tree-select';

    @Injectable({ providedIn: 'root' })
    export class TreeSelectHttpProvider implements TreeSelectProvider {
      private readonly http = inject(HttpClient);
      private readonly baseUrl = '/api/treeItems';
      private readonly perPage = 50;

      loadRoots = (req: NodeRequest) => this.fetch(this.baseUrl, req);
      loadChildren = (parentId: string, req: NodeRequest) =>
        this.fetch(\`\${this.baseUrl}/\${parentId}/children\`, req);
      search = (query: string, req: NodeRequest) =>
        this.fetch(\`\${this.baseUrl}/search\`, req, query);

      private async fetch(url: string, req: NodeRequest, query?: string): Promise<NodePage> {
        const page = Math.floor((req.offset ?? 0) / this.perPage) + 1;
        let params = new HttpParams()
          .set('page', String(page)).set('perPage', String(this.perPage));
        if (query !== undefined) params = params.set('q', query);
        const r = await firstValueFrom(this.http.get<any>(url, { params }));
        return {
          nodes: r.items.map((d: any): TreeNode => ({
            id: String(d.id), label: d.name, lazy: d.childCount > 0, meta: { code: d.code },
          })),
          hasMore: r.page * r.pageSize < r.totalCount,
        };
      }
    }
  `;

  protected readonly snippetMultipleHtml = dedent`
    <bs-form>
      <bs-tree-select
        mode="multiple"
        [provider]="memoryProvider"
        placeholder="Pick a few…"
        [(value)]="multipleValue">
      </bs-tree-select>
    </bs-form>
  `;

  protected readonly snippetMultipleTs = dedent`
    import { InMemoryTreeSelectProvider, type TreeNode } from '@mintplayer/ng-bootstrap/tree-select';

    const SAMPLE_TREE: TreeNode[] = [
      {
        id: 'fruit', label: 'Fruit', children: [
          { id: 'apple', label: 'Apple' },
          { id: 'banana', label: 'Banana' },
          { id: 'citrus', label: 'Citrus', children: [
            { id: 'orange', label: 'Orange' },
            { id: 'lemon', label: 'Lemon' },
          ] },
        ],
      },
      { id: 'vegetables', label: 'Vegetables', children: [
        { id: 'carrot', label: 'Carrot' },
        { id: 'potato', label: 'Potato' },
      ] },
    ];

    memoryProvider = new InMemoryTreeSelectProvider(SAMPLE_TREE, { pageSize: 50 });
    multipleValue = signal<TreeNode[]>([]);
  `;

  protected readonly snippetCheckboxHtml = dedent`
    <bs-form>
      <bs-tree-select
        mode="checkbox"
        [cascadeSelect]="true"
        [provider]="memoryProvider"
        placeholder="Select branches…"
        [(value)]="checkboxValue">
      </bs-tree-select>
    </bs-form>
  `;

  protected readonly snippetButtonHtml = dedent`
    <bs-form>
      <bs-tree-select
        variant="button"
        [showClear]="true"
        [provider]="memoryProvider"
        placeholder="Choose one"
        [(value)]="buttonValue">
      </bs-tree-select>
    </bs-form>
  `;

  protected readonly snippetTemplatesHtml = dedent`
    <bs-form>
      <bs-tree-select mode="multiple" [provider]="memoryProvider" [(value)]="value">
        <!-- Custom chip (projected light-DOM; root carries slot="chips").
             Style it with your own page CSS (.ts-tpl-chip). -->
        <ng-template bsTreeSelectItem let-node let-remove="remove">
          <span slot="chips" class="ts-tpl-chip">
            {{ node.label }}
            <button type="button" class="ts-tpl-chip-remove" (click)="remove()">&times;</button>
          </span>
        </ng-template>

        <!-- Suggestion rows render in the treeview shadow — page CSS can't reach
             them, so use intrinsic elements (or inline styles). -->
        <ng-template bsTreeSelectSuggestion let-node>
          <strong>{{ node.label }}</strong>
          <small>&nbsp;({{ node.id }})</small>
        </ng-template>
      </bs-tree-select>
    </bs-form>
  `;
}
