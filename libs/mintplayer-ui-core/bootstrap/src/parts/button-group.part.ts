import { buttonGroupBootstrapPageStyles, buttonGroupBootstrapStyles } from '../../../styles/parts/button-group.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapButtonGroup: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapStyles, page: false, order: 7 };
export const bootstrapButtonGroupPage: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapPageStyles, page: true, order: 7 };
