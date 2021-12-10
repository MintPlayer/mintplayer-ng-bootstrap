import { trigger, state, style, transition, group, animate, query } from '@angular/animations';

export const CarouselSlideAnimation =
  trigger('carouselSlide', [
    // One time initial load. Move page from left -100% to 0%
    transition('-1 => *', [
      query(':enter', [
        style({ position: 'fixed', width: '100%', transform: 'translateX(-100%)' }),
        animate(
          '50000ms ease',
          style({ opacity: 1, transform: 'translateX(0%)' }),
        ),
      ]),
    ]),

    // Previous, slide left to right to show left page
    transition(':decrement', [
      // set new page X location to be -100%
      query(':enter',
        style({ position: 'fixed', width: '100%', transform: 'translateX(-100%)' }),
      ),

      group([
        // slide existing page from 0% to 100% to the right
        query(':leave',
          animate(
            '50000ms ease',
            style({ position: 'fixed', width: '100%', transform: 'translateX(100%)' }),
          ),
        ),
        // slide new page from -100% to 0% to the right
        query(':enter',
          animate(
            '50000ms ease',
            style({ opacity: 1, transform: 'translateX(0%)' }),
          ),
        ),
      ]),
    ]),

    // Next, slide right to left to show right page
    transition(':increment', [
      // set new page X location to be 100%
      query(':enter',
        style({ position: 'fixed', width: '100%', transform: 'translateX(100%)' }),
      ),

      group([
        // slide existing page from 0% to -100% to the left
        query(':leave',
          animate(
            '50000ms ease',
            style({ position: 'fixed', width: '100%', transform: 'translateX(-100%)' }),
          ),
        ),
        // slide new page from 100% to 0% to the left
        query(':enter',
          animate(
            '50000ms ease',
            style({ opacity: 1, transform: 'translateX(0%)' }),
          ),
        ),
      ]),
    ])
  ]);