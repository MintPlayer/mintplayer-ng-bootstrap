import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { DatatableFetch, DatatableFilters, DistinctValues, DistinctsRequest, SortColumn } from '@mintplayer/ng-bootstrap/datatable';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Customer {
  id: number;
  name: string;
  country: string;
  email: string;
  /** An ISO instant. */
  createdAt: string;
}

/** The page's `fetchParams`: a name search the API applies next to the column filters. A type, not an interface, so it is JSON. */
export type CustomerParams = {
  search: string;
};

/** The body `api/customers/table` takes: the datatable's own request, minus the signal. */
interface TableRequest {
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
  filters: DatatableFilters;
  params: CustomerParams | undefined;
}

/**
 * The apps/api customers endpoints speak the datatable's request shape, so
 * the table's filters reach SQL unchanged (#448): the table never filters.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/api/customers`;

  fetch: DatatableFetch<Customer, CustomerParams> = ({ page, perPage, sortColumns, filters, params }) =>
    firstValueFrom(
      this.http.post<{ data: Customer[]; totalRecords: number }>(`${this.baseUrl}/table`, <TableRequest>{ page, perPage, sortColumns, filters, params }),
    );

  distincts = ({ column, search, filters, params }: DistinctsRequest<CustomerParams>): Promise<DistinctValues> =>
    firstValueFrom(this.http.post<DistinctValues>(`${this.baseUrl}/distincts`, { column, search, filters, params }));
}
