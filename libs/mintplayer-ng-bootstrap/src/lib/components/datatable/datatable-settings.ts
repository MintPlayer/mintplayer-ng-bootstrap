import { PaginationRequest } from "@mintplayer/ng-pagination";

export class DatatableSettings {
    constructor(data?: Partial<DatatableSettings>) {
        Object.assign(this, data);

        if (data && data.perPage) {
            this.perPage = data.perPage;
        } else {
            // Set default value
            this.perPage = {
                values: [10, 20, 50],
                selected: 20
            };
        }
        
        if (data && data.page) {
            this.page = data.page;
        } else {
            // Set default value
            this.page = {
                values: [1],
                selected: 1
            };
        }
    }

    public sortProperty = '';
    public sortDirection: 'ascending' | 'descending' = 'ascending';
    public perPage: { values: number[], selected: number };
    public page: { values: number[], selected: number };

    public toPagination() {
        const res = <PaginationRequest>{
            sortProperty: this.sortProperty,
            sortDirection: this.sortDirection,
            perPage: this.perPage.selected,
            page: this.page.selected
        };
        return res;
    }
}