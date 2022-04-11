import { trigger, style, transition, animate, query, animateChild } from '@angular/animations';

export const EnterFromHostAnimation = 
    trigger('enterFromHost', [
        transition('* => void', [
            query('@*', [animateChild()], {optional: true})
        ])
    ]);

export const EnterFromAnimation =
    trigger('enterFrom', [
        transition(
            ':enter', [
                style({ top: '-50%' }),
                animate('{{ duration }}', style({ top: '0' })),
            ], {
                params: {
                    duration: '500ms'
                }
            }
        ),
        transition(
            ':leave', [
                style({ top: '0' }),
                animate('{{ duration }}', style({ top: '-50%' }))
            ], {
                params: {
                    duration: '500ms'
                }
            }
        ),
    ]);