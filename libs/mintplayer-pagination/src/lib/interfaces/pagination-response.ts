export class PaginationResponse<T> {
    perPage = 20;
    page = 1;
    
    data: T[] = [];
    totalRecords = 0;
    totalPages = 0;
}