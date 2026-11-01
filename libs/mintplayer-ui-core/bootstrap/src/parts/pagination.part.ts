import { paginationBootstrapPageStyles, paginationBootstrapStyles } from '../../../styles/parts/pagination.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapPagination: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapStyles, page: false, order: 13 };
export const bootstrapPaginationPage: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapPageStyles, page: true, order: 13 };
