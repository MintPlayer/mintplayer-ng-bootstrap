import { listGroupBootstrapPageStyles, listGroupBootstrapStyles } from '../../../styles/parts/list-group.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapListGroup: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapStyles, page: false, order: 17 };
export const bootstrapListGroupPage: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapPageStyles, page: true, order: 17 };
