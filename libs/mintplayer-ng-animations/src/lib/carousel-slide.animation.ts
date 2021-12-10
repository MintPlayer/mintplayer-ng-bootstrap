import { trigger, state, style, transition, group, animate } from '@angular/animations';

export const CarouselSlideAnimation =
  trigger('carouselSlide', [
    transition(':enter', [
      style({ left: '100%' }),
      animate('400ms', style({ left: 0 })),
    ]),
    transition(':leave', [
      style({ left: '0' }),
      animate('400ms', style({ left: '-100%' }))
    ]),
  ]);