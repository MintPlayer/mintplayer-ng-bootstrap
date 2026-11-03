import { navbarBootstrapPageStyles, navbarBootstrapStyles } from '../../../styles/parts/navbar.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapNavbar: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapStyles, page: false, order: 9 };
export const bootstrapNavbarPage: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapPageStyles, page: true, order: 9 };
