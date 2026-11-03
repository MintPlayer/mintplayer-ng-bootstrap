import { badgeBootstrapPageStyles, badgeBootstrapStyles } from '../../../styles/parts/badge.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapBadge: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapStyles, page: false, order: 14 };
export const bootstrapBadgePage: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapPageStyles, page: true, order: 14 };
