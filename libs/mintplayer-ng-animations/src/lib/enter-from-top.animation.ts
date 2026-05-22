import { trigger, style, transition, animate } from '@angular/animations';

export const EnterFromTopAnimation =
  trigger('enterFromTop', [
    transition(
      ':enter', [
        style({ top: '-50%' }),
        animate('{{ duration }} ease-in-out', style({ top: 0 })),
      ], {
        params: {
          duration: '500ms'
        }
      }
    ),
    transition(
      ':leave', [
        animate('{{ duration }} ease-in-out', style({ top: '-50%' }))
      ], {
        params: {
          duration: '500ms'
        }
      }
    ),
  ]);