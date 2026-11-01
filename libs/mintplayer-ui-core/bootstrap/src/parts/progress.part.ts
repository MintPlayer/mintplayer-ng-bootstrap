import { progressBootstrapPageStyles, progressBootstrapStyles } from '../../../styles/parts/progress.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapProgress: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapStyles, page: false, order: 16 };
export const bootstrapProgressPage: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapPageStyles, page: true, order: 16 };
