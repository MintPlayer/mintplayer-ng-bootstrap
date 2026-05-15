import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import {
  BsDatatableComponent,
  BsDatatableColumnDirective,
  BsRowTemplateDirective,
  BsDatatableFetch,
  DatatableSettings,
} from '@mintplayer/ng-bootstrap/datatable';
import { BsQueryBuilderComponent, BsQueryBuilderEditorDirective } from '@mintplayer/ng-bootstrap/query-builder';
import type {
  EntitySchema,
  Expression,
  SavedQuery,
} from '@mintplayer/ng-bootstrap/query-builder';
import { emptyGroup } from '@mintplayer/ng-bootstrap/query-builder';

interface OrderDto {
  id: number;
  customerId: number;
  total: number;
  status: string;
  orderDate: string;
  tags: string;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface SortDescriptor {
  field: string;
  direction: 'asc' | 'desc';
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
    BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective,
    FormsModule, DatePipe, DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryBuilderDemoComponent {
  private http = inject(HttpClient);

  schema = signal<EntitySchema[]>([]);
  rootEntity = signal<string>('orders');
  query = signal<Expression>(emptyGroup('and'));

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
   * `fetch` reads `this.query()` at call time so column-sort / page-change
   * refetches always send the current tree. Clicking "Search" after edits
   * forces a refetch by replacing the settings instance (see `search()`).
   */
  fetchOrders: BsDatatableFetch<OrderDto> = async (req: PaginationRequest) => {
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
      const r = await firstValueFrom(this.http.post<PagedResult<OrderDto>>('/api/orders/search', body));
      this.lastTotal.set(r.totalCount);
      return <PaginationResponse<OrderDto>>{
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
      return <PaginationResponse<OrderDto>>{
        data: [], totalRecords: 0, totalPages: 1, page: req.page, perPage: req.perPage,
      };
    } finally {
      this.busy.set(false);
    }
  };

  constructor() {
    this.refreshSchema();
  }

  refreshSchema(): void {
    this.http.get<EntitySchema[]>('/api/orders/schema').subscribe({
      next: (s) => this.schema.set(s),
      error: () => this.error.set('Could not fetch schema. Is apps/api running?'),
    });
  }

  /**
   * Replace the settings signal with a fresh instance — even when the values
   * are unchanged, the new reference makes bs-datatable's reactive fetch
   * effect refire. Reset page to 1 because the new query may not have results
   * past page 1.
   */
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
}

function tryGetTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
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
