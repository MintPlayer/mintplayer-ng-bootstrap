import { dropdownBootstrapPageStyles, dropdownBootstrapStyles } from '../../../styles/parts/dropdown.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapDropdown: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapStyles, page: false, order: 6 };
export const bootstrapDropdownPage: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapPageStyles, page: true, order: 6 };
