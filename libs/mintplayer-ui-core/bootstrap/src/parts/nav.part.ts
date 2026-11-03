import { navBootstrapPageStyles, navBootstrapStyles } from '../../../styles/parts/nav.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapNav: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapStyles, page: false, order: 8 };
export const bootstrapNavPage: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapPageStyles, page: true, order: 8 };
