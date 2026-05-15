import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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

interface QueryRequest {
  query: Expression;
  timezone?: string;
  page: number;
  pageSize: number;
}

const SAVED_QUERIES_KEY = 'mp-qb-demo:savedQueries';

@Component({
  selector: 'demo-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
  imports: [BsQueryBuilderComponent, BsQueryBuilderEditorDirective, FormsModule, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryBuilderDemoComponent {
  private http = inject(HttpClient);

  schema = signal<EntitySchema[]>([]);
  rootEntity = signal<string>('orders');
  query = signal<Expression>(emptyGroup('and'));

  page = signal(1);
  pageSize = signal(20);
  result = signal<PagedResult<OrderDto>>({ items: [], totalCount: 0, page: 1, pageSize: 20 });
  busy = signal(false);
  error = signal<string | null>(null);

  savedQueries = signal<SavedQuery[]>(loadSavedQueries());

  jsonView = computed(() => JSON.stringify(this.query(), null, 2));

  totalPages = computed(() => Math.max(1, Math.ceil(this.result().totalCount / this.pageSize())));

  constructor() {
    this.refreshSchema();
  }

  refreshSchema(): void {
    this.http.get<EntitySchema[]>('/api/orders/schema').subscribe({
      next: (s) => this.schema.set(s),
      error: () => this.error.set('Could not fetch schema. Is apps/api running?'),
    });
  }

  search(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const req: QueryRequest = {
      query: this.query(),
      timezone: tryGetTimezone(),
      page: this.page(),
      pageSize: this.pageSize(),
    };
    this.http.post<PagedResult<OrderDto>>('/api/orders/search', req).subscribe({
      next: (r) => {
        this.result.set(r);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        const detail = (err as { error?: { code?: string; detail?: string } }).error;
        this.error.set(detail?.code
          ? `${detail.code}${detail.detail ? `: ${detail.detail}` : ''}`
          : 'Request failed');
        this.busy.set(false);
      },
    });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.search();
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
      this.page.set(1);
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
