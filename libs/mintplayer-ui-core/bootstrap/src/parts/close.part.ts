import { closeBootstrapPageStyles, closeBootstrapStyles } from '../../../styles/parts/close.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapClose: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapStyles, page: false, order: 18 };
export const bootstrapClosePage: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapPageStyles, page: true, order: 18 };
