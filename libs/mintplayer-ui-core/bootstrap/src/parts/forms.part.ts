import { formsBootstrapPageStyles, formsBootstrapStyles } from '../../../styles/parts/forms.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapForms: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapStyles, page: false, order: 3 };
export const bootstrapFormsPage: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapPageStyles, page: true, order: 3 };
