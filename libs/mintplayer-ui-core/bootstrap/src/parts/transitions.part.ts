import { transitionsBootstrapPageStyles, transitionsBootstrapStyles } from '../../../styles/parts/transitions.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapTransitions: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapStyles, page: false, order: 5 };
export const bootstrapTransitionsPage: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapPageStyles, page: true, order: 5 };
