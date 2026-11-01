import { gridBootstrapPageStyles, gridBootstrapStyles } from '../../../styles/parts/grid.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapGrid: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapStyles, page: false, order: 1 };
export const bootstrapGridPage: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapPageStyles, page: true, order: 1 };
