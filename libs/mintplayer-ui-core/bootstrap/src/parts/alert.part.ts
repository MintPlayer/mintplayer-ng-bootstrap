import { alertBootstrapPageStyles, alertBootstrapStyles } from '../../../styles/parts/alert.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapAlert: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapStyles, page: false, order: 15 };
export const bootstrapAlertPage: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapPageStyles, page: true, order: 15 };
