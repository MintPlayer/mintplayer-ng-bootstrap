export class DatatableSettingsMock {
    constructor(data?: Partial<DatatableSettingsMock>) {}

    public sortProperty = '';
    public sortDirection: 'ascending' | 'descending' = 'ascending';
    public perPage = {
        values: [10, 20, 50],
        selected: 20
    };
    public page = {
        values: [1, 2, 3],
        selected: 1
    };
}