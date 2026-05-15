import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableComponent,
  BsRowTemplateDirective,
  BsDatatableFetch,
  DatatableSettings,
  type ColumnDef,
} from '@mintplayer/ng-bootstrap/datatable';
import { BsQueryBuilderComponent, BsQueryBuilderEditorDirective } from '@mintplayer/ng-bootstrap/query-builder';
import { environment } from '../../../../environments/environment';
import type {
  EntitySchema,
  Expression,
  SavedQuery,
  SortDescriptor,
} from '@mintplayer/ng-bootstrap/query-builder';
import { emptyGroup } from '@mintplayer/ng-bootstrap/query-builder';

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface QueryRequest {
  query: Expression;
  timezone?: string;
  page: number;
  pageSize: number;
  sort?: SortDescriptor[];
}

const SAVED_QUERIES_KEY = 'mp-qb-demo:savedQueries';

@Component({
  selector: 'demo-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
  imports: [
    BsQueryBuilderComponent, BsQueryBuilderEditorDirective,
    BsDatatableComponent, BsRowTemplateDirective,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryBuilderDemoComponent {
  private http = inject(HttpClient);

  schema = signal<EntitySchema[]>([]);
  rootEntity = signal<string>('orders');
  query = signal<Expression>(emptyGroup('and'));

  // Phase-2 signals: drive the new toolbar widgets in mp-query-builder.
  selectedFields = signal<string[]>([]);
  sortBy = signal<SortDescriptor[]>([]);

  settings = signal(new DatatableSettings({
    perPage: { values: [10, 20, 50, 100], selected: 20 },
    page: { values: [1], selected: 1 },
  }));

  busy = signal(false);
  error = signal<string | null>(null);
  lastTotal = signal(0);

  savedQueries = signal<SavedQuery[]>(loadSavedQueries());

  jsonView = computed(() => JSON.stringify(this.query(), null, 2));

  /**
   * Schema-driven datatable column list: starts from the current entity's
   * non-relation fields, then filters to `selectedFields()` (when non-empty).
   * Empty `selectedFields()` is treated as "show everything" so the demo is
   * never blank.
   */
  datatableColumns = computed<ColumnDef[]>(() => {
    const entity = this.schema().find((s) => s.name === this.rootEntity());
    if (!entity) return [];
    const projectable = entity.fields.filter((f) => f.type !== 'relation');
    const selected = this.selectedFields();
    const visible = selected.length === 0
      ? projectable
      : projectable.filter((f) => selected.includes(f.name));
    // `id` is non-sortable for the same reason as the pre-Phase-2 demo: there's
    // no meaningful Id in the schema, and Sort by Id is the implicit default.
    return visible.map((f) => ({ name: f.name, label: f.label, sortable: true }));
  });

  fetchRows: BsDatatableFetch<Record<string, unknown>> = async (req: PaginationRequest) => {
    this.busy.set(true);
    this.error.set(null);
    try {
      const body: QueryRequest = {
        query: this.query(),
        timezone: tryGetTimezone(),
        page: req.page,
        pageSize: req.perPage,
        sort: req.sortColumns?.length
          ? req.sortColumns.map((c) => ({
              field: c.property,
              direction: c.direction === 'ascending' ? 'asc' : 'desc',
            }))
          : undefined,
      };
      const url = `${environment.apiBase}/api/${this.rootEntity()}/search`;
      const r = await firstValueFrom(this.http.post<PagedResult<Record<string, unknown>>>(url, body));
      this.lastTotal.set(r.totalCount);
      return <PaginationResponse<Record<string, unknown>>>{
        data: r.items,
        totalRecords: r.totalCount,
        totalPages: Math.max(1, Math.ceil(r.totalCount / r.pageSize)),
        page: r.page,
        perPage: r.pageSize,
      };
    } catch (err) {
      const detail = (err as HttpErrorResponse).error as { code?: string; detail?: string } | undefined;
      this.error.set(detail?.code
        ? `${detail.code}${detail.detail ? `: ${detail.detail}` : ''}`
        : 'Request failed');
      this.lastTotal.set(0);
      return <PaginationResponse<Record<string, unknown>>>{
        data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage,
      };
    } finally {
      this.busy.set(false);
    }
  };

  constructor() {
    this.refreshSchema();

    // Entity-change effect: clear the tree (field references from the OLD entity
    // are no longer valid against the new schema) and re-default selectedFields
    // to "all" for the new entity (signalled as `[]`). sortBy and settings are
    // also reset so old sort columns don't linger.
    effect(() => {
      // Re-run whenever rootEntity changes. Use untracked() inside so we only
      // depend on rootEntity, not the downstream signals we're resetting.
      this.rootEntity();
      untracked(() => {
        this.query.set(emptyGroup('and'));
        this.selectedFields.set([]);
        this.sortBy.set([]);
        this.settings.set(new DatatableSettings({
          sortColumns: [],
          perPage: this.settings().perPage,
          page: { values: this.settings().page.values, selected: 1 },
        }));
      });
    });

    // sortBy → settings.sortColumns one-way sync. Datatable header clicks
    // write to settings.sortColumns; we mirror them BACK into sortBy via a
    // separate effect below.
    effect(() => {
      const sort = this.sortBy();
      const current = untracked(() => this.settings());
      const nextSortColumns = sort.map((s) => ({
        property: s.field,
        direction: (s.direction === 'asc' ? 'ascending' : 'descending') as 'ascending' | 'descending',
      }));
      // Identity check to avoid spurious refetches.
      if (sortColumnsEqual(current.sortColumns, nextSortColumns)) return;
      this.settings.set(new DatatableSettings({
        sortColumns: nextSortColumns,
        perPage: current.perPage,
        page: current.page,
      }));
    });

    // settings.sortColumns → sortBy mirror. Datatable header clicks update
    // settings.sortColumns; we feed those back into the toolbar.
    effect(() => {
      const cols = this.settings().sortColumns;
      const current = untracked(() => this.sortBy());
      const next = cols.map((c) => ({
        field: c.property,
        direction: (c.direction === 'ascending' ? 'asc' : 'desc') as 'asc' | 'desc',
      }));
      if (sortByEqual(current, next)) return;
      untracked(() => this.sortBy.set(next));
    });
  }

  refreshSchema(): void {
    this.http.get<EntitySchema[]>(`${environment.apiBase}/api/${this.rootEntity()}/schema`).subscribe({
      next: (s) => this.schema.set(s),
      error: () => this.error.set('Could not fetch schema. Is apps/api running?'),
    });
  }

  search(): void {
    const s = this.settings();
    this.settings.set(new DatatableSettings({
      sortColumns: s.sortColumns,
      perPage: s.perPage,
      page: { values: s.page.values, selected: 1 },
    }));
  }

  onSaveQuery(e: { name: string; tree: Expression }): void {
    const next = [...this.savedQueries().filter((s) => s.name !== e.name), {
      name: e.name,
      tree: e.tree,
      createdAt: new Date().toISOString(),
    }];
    this.savedQueries.set(next);
    persistSavedQueries(next);
  }

  onLoadQuery(e: { name: string }): void {
    const sq = this.savedQueries().find((s) => s.name === e.name);
    if (sq) {
      this.query.set(sq.tree);
      this.search();
    }
  }

  onDeleteQuery(e: { name: string }): void {
    const next = this.savedQueries().filter((s) => s.name !== e.name);
    this.savedQueries.set(next);
    persistSavedQueries(next);
  }

  /** Generic cell formatter — schema-driven, since the row shape changes
   *  with `rootEntity`. */
  formatCell(row: Record<string, unknown> | undefined, fieldName: string): string {
    if (!row) return '';
    const v = row[fieldName];
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v.toString();
    if (typeof v === 'string') return v;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v);
  }
}

function tryGetTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function sortColumnsEqual(
  a: readonly { property: string; direction: 'ascending' | 'descending' }[],
  b: readonly { property: string; direction: 'ascending' | 'descending' }[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.property !== b[i]!.property || a[i]!.direction !== b[i]!.direction) return false;
  }
  return true;
}

function sortByEqual(a: readonly SortDescriptor[], b: readonly SortDescriptor[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.field !== b[i]!.field || a[i]!.direction !== b[i]!.direction) return false;
  }
  return true;
}

function loadSavedQueries(): SavedQuery[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_QUERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuery[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedQueries(qs: SavedQuery[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(qs));
  } catch {
    // Quota / disabled — ignore.
  }
}
