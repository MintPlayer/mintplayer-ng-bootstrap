import { trigger, style, transition, animate } from '@angular/animations';

export const FadeInOutAnimation =
  trigger('fadeInOut', [
    transition(
      ':enter', [
        style({ opacity: 0 }),
        animate('{{ duration }}', style({ opacity: 1 })),
      ], {
        params: {
          duration: '500ms'
        }
      }
    ),
    transition(
      ':leave', [
        animate('{{ duration }}', style({ opacity: 0 }))
      ], {
        params: {
          duration: '500ms'
        }
      }
    ),
  ]);