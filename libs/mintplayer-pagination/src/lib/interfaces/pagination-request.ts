import { SortColumn } from "./sort-column";

export class PaginationRequest {
    perPage = 20;
    page = 1;
    sortColumns: SortColumn[] = [];
}