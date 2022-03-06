import { trigger, style, transition, group, animate, query } from '@angular/animations';

export const CarouselSlideAnimation =
  trigger('carouselSlide', [

    // Previous, slide left to right to show left page
    transition(':decrement', [
      group([
        // slide existing page from 0% to 100% to the right
        query(':leave',
          animate(
            '500ms ease',
            style({ width: '100%', transform: 'translateX(100%)' }),
          ),
        ),
        // slide new page from -100% to 0% to the right
        query(':enter',
          group([
            style({ width: '100%', transform: 'translateX(-100%)' }),
            animate(
              '500ms ease',
              style({ opacity: 1, transform: 'translateX(0%)' }),
            ),
          ])
        ),
      ]),
    ]),

    // Next, slide right to left to show right page
    transition(':increment', [
      group([
        // slide existing page from 0% to -100% to the left
        query(':leave',
          animate(
            '500ms ease',
            style({ width: '100%', transform: 'translateX(-100%)' }),
          ),
        ),
        // slide new page from 100% to 0% to the left
        query(':enter',
          group([
            style({ width: '100%', transform: 'translateX(100%)' }),
            animate(
              '500ms ease',
              style({ opacity: 1, transform: 'translateX(0%)' }),
            ),
          ])
        ),
      ]),
    ])
  ]);