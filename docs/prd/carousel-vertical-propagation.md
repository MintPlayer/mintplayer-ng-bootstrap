# Fixing carousel touch-event propagation
## Related components
The <bs-carousel> component from the `@mintplayer/ng-bootstrap` library uses the `@mintplayer/ng-swiper` library.
The swiper library contains the core, reusable logic for the carousel functionality.

## Problem statement
On mobile devices, touch events on a vertical carousel cause the page to scroll.
Touch-events on the `bsSwipe` directive should not scroll the page.
