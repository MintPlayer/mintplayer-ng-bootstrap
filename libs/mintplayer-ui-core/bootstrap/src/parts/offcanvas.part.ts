import { offcanvasBootstrapPageStyles, offcanvasBootstrapStyles } from '../../../styles/parts/offcanvas.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapOffcanvas: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapStyles, page: false, order: 25 };
export const bootstrapOffcanvasPage: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapPageStyles, page: true, order: 25 };
