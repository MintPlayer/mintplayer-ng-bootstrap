import { modalBootstrapPageStyles, modalBootstrapStyles } from '../../../styles/parts/modal.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapModal: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapStyles, page: false, order: 20 };
export const bootstrapModalPage: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapPageStyles, page: true, order: 20 };
