import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsDatatableFetch, BsDatatableFetchRequest } from '@mintplayer/ng-bootstrap/datatable';
import { firstValueFrom } from 'rxjs';
import { TreeItem } from '../../entities/tree-item';
import { environment } from '../../../environments/environment';

/**
 * Shape returned by the apps/api `TreeItemsController` endpoints. The Angular
 * `BsDatatableFetch` contract speaks `PaginationResponse<T>` (data /
 * totalRecords / totalPages), so the service maps `PagedResult<T>` →
 * `PaginationResponse<T>` at the boundary.
 */
interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class TreeItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/api/treeItems`;

  /**
   * `BsDatatableFetch` callback that branches on `parentId`: undefined/null
   * loads roots; a numeric parentId loads that item's direct children. Both
   * paths share the same response shape so `<bs-datatable>` consumes them
   * identically.
   */
  fetch: BsDatatableFetch<TreeItem> = async (req: BsDatatableFetchRequest) => {
    const params = this.buildParams(req);
    const url = req.parentId == null
      ? this.baseUrl
      : `${this.baseUrl}/${req.parentId}/children`;
    const result = await firstValueFrom(this.http.get<PagedResult<TreeItem>>(url, { params }));
    return this.toPaginationResponse(result, req);
  };

  private buildParams(req: BsDatatableFetchRequest): HttpParams {
    let params = new HttpParams()
      .set('page', String(req.page ?? 1))
      .set('perPage', String(req.perPage ?? 50));
    if (req.sortColumns?.length) {
      const first = req.sortColumns[0];
      const dir = first.direction === 'descending' ? 'desc' : 'asc';
      params = params.set('sort', `${first.property}:${dir}`);
    }
    return params;
  }

  private toPaginationResponse(
    result: PagedResult<TreeItem>,
    req: BsDatatableFetchRequest,
  ): PaginationResponse<TreeItem> {
    const totalRecords = result?.totalCount ?? 0;
    const perPage = result?.pageSize ?? req.perPage ?? 50;
    return {
      data: result?.items ?? [],
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / perPage)),
      page: result?.page ?? req.page ?? 1,
      perPage,
    };
  }
}
