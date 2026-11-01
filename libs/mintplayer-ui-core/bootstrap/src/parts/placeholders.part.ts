import { placeholdersBootstrapPageStyles, placeholdersBootstrapStyles } from '../../../styles/parts/placeholders.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapPlaceholders: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapStyles, page: false, order: 26 };
export const bootstrapPlaceholdersPage: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapPageStyles, page: true, order: 26 };
