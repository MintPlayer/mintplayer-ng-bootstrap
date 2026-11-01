import { tooltipBootstrapPageStyles, tooltipBootstrapStyles } from '../../../styles/parts/tooltip.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapTooltip: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapStyles, page: false, order: 21 };
export const bootstrapTooltipPage: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapPageStyles, page: true, order: 21 };
