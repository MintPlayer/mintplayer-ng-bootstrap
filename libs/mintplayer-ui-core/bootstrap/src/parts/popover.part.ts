import { popoverBootstrapPageStyles, popoverBootstrapStyles } from '../../../styles/parts/popover.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapPopover: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapStyles, page: false, order: 22 };
export const bootstrapPopoverPage: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapPageStyles, page: true, order: 22 };
