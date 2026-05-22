import { trigger, style, transition, animate, state } from '@angular/animations';

export const SlideUpDownAnimation =
  trigger('slideUpDown', [
    // trigger value binding
    state('false', style({ height: 0 })),
    state('true', style({ height: '*' })),
    transition('false => true', [
      style({ height: 0 }),
      animate('300ms ease-in-out', style({ height: '*' })),
    ]),
    transition('true => false', [
      style({ height: '*' }),
      animate('300ms ease-in-out', style({ height: 0 })),
    ]),
  ]);