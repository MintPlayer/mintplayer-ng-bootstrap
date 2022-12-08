import { SortDirection } from "../types/sort-direction";

export class PaginationRequest {
    perPage = 20;
    page = 1;
    sortProperty = '';
    sortDirection: SortDirection = 'ascending';
}