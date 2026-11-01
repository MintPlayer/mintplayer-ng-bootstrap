import { toastsBootstrapPageStyles, toastsBootstrapStyles } from '../../../styles/parts/toasts.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapToasts: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapStyles, page: false, order: 19 };
export const bootstrapToastsPage: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapPageStyles, page: true, order: 19 };
