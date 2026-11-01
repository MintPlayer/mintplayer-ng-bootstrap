import { cardBootstrapPageStyles, cardBootstrapStyles } from '../../../styles/parts/card.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapCard: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapStyles, page: false, order: 10 };
export const bootstrapCardPage: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapPageStyles, page: true, order: 10 };
