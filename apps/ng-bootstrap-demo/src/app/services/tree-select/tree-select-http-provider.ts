import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NodePage,
  NodeRequest,
  TreeNode,
  TreeSelectProvider,
} from '@mintplayer/ng-bootstrap/tree-select';
import { environment } from '../../../environments/environment';

/** Shape returned by the apps/api `TreeItemsController` endpoints. */
interface TreeItemDto {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  headcount: number;
  childCount: number;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * A {@link TreeSelectProvider} that talks to the real backend `TreeItemsController`.
 * Backs the server-search tree-select demo. `req.offset` (item offset) is mapped
 * to the backend's 1-based `page` using a fixed `perPage`.
 */
@Injectable({ providedIn: 'root' })
export class TreeSelectHttpProvider implements TreeSelectProvider {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/api/treeItems`;
  private readonly perPage = 50;

  loadRoots(req: NodeRequest): Promise<NodePage> {
    return this.fetch(this.baseUrl, req);
  }

  loadChildren(parentId: string, req: NodeRequest): Promise<NodePage> {
    return this.fetch(`${this.baseUrl}/${parentId}/children`, req);
  }

  search(query: string, req: NodeRequest): Promise<NodePage> {
    return this.fetch(`${this.baseUrl}/search`, req, query);
  }

  private async fetch(url: string, req: NodeRequest, query?: string): Promise<NodePage> {
    const page = Math.floor((req.offset ?? 0) / this.perPage) + 1;
    let params = new HttpParams()
      .set('page', String(page))
      .set('perPage', String(this.perPage));
    if (query !== undefined) params = params.set('q', query);

    const result = await this.toPromise(
      this.http.get<PagedResult<TreeItemDto>>(url, { params }),
      req.signal,
    );
    return this.toNodePage(result);
  }

  /**
   * Angular's HttpClient cancels via unsubscription (it has no `signal`
   * option), so we bridge the request's AbortSignal to an unsubscribe — this
   * actually cancels the in-flight XHR when a newer search supersedes it.
   */
  private toPromise<T>(obs: Observable<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = () => {
        sub.unsubscribe();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const sub = obs.subscribe({
        next: (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        error: (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        },
      });
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private toNodePage(result: PagedResult<TreeItemDto>): NodePage {
    const items = result?.items ?? [];
    const page = result?.page ?? 1;
    const pageSize = result?.pageSize ?? this.perPage;
    const totalCount = result?.totalCount ?? 0;
    return {
      nodes: items.map((dto) => this.toNode(dto)),
      hasMore: page * pageSize < totalCount,
    };
  }

  private toNode(dto: TreeItemDto): TreeNode {
    return {
      id: String(dto.id),
      label: dto.name,
      lazy: dto.childCount > 0,
      meta: { code: dto.code },
    };
  }
}
