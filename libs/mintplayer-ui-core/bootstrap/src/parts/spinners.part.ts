import { spinnersBootstrapPageStyles, spinnersBootstrapStyles } from '../../../styles/parts/spinners.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapSpinners: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapStyles, page: false, order: 24 };
export const bootstrapSpinnersPage: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapPageStyles, page: true, order: 24 };
