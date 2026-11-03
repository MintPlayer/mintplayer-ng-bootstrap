import { tablesBootstrapPageStyles, tablesBootstrapStyles } from '../../../styles/parts/tables.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapTables: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapStyles, page: false, order: 2 };
export const bootstrapTablesPage: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapPageStyles, page: true, order: 2 };
