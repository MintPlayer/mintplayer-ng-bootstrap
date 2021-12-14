import { trigger, state, style, transition, group, animate } from '@angular/animations';

export const FadeInOutAnimation =
  trigger('fadeInOut', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('500ms', style({ opacity: 1 })),
    ]),
    transition(':leave', [
      animate('500ms', style({ opacity: 0 }))
    ]),
  ]);