import { trigger, style, transition, animate } from '@angular/animations';

export const SlideUpDownNgifAnimation =
  trigger('slideUpDownNgif', [
    transition(':enter', [
      style({ height: 0 }),
      animate('300ms ease-in-out', style({ height: '*' })),
    ]),
    transition(':leave', [
      style({ height: '*' }),
      animate('300ms ease-in-out', style({ height: 0 })),
    ]),
  ]);