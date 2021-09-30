import { trigger, state, style, transition, group, animate } from '@angular/animations';

export const SlideUpDownAnimation =
  trigger('slideUpDown', [
    state('down', style({
      'height': '*',
    })),
    state('up', style({
      'height': '0px',
    })),
    transition('down => up', [
      group([
        animate('300ms ease-in-out', style({
          'height': '0px'
        })),
      ])
    ]),
    transition('up => down', [
      group([
        animate('300ms ease-in-out', style({
          'height': '*'
        })),
      ])
    ]),
  ]);