import { accordionBootstrapPageStyles, accordionBootstrapStyles } from '../../../styles/parts/accordion.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapAccordion: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapStyles, page: false, order: 11 };
export const bootstrapAccordionPage: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapPageStyles, page: true, order: 11 };
