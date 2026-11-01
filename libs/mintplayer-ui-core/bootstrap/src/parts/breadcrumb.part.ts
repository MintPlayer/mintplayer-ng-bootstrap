import { breadcrumbBootstrapPageStyles, breadcrumbBootstrapStyles } from '../../../styles/parts/breadcrumb.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapBreadcrumb: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapStyles, page: false, order: 12 };
export const bootstrapBreadcrumbPage: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapPageStyles, page: true, order: 12 };
