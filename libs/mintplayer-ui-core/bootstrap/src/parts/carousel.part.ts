import { carouselBootstrapPageStyles, carouselBootstrapStyles } from '../../../styles/parts/carousel.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapCarousel: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapStyles, page: false, order: 23 };
export const bootstrapCarouselPage: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapPageStyles, page: true, order: 23 };
