# Bootstrap 5 Carousel for Angular - Product Requirements Document

## Overview

A Bootstrap 5 compatible carousel component for Angular that provides smooth animations, touch support, and accessibility features. The component uses Angular signals for state management (no RxJS) and integrates with the `@mintplayer/ng-swiper` library for touch/swipe functionality.

> **Important:** This implementation may overwrite or remove existing carousel and swiper code. The current implementation will be refactored to meet these requirements. Backwards compatibility is not guaranteed.

---

## Technical Stack

- **Framework**: Angular (standalone components)
- **State Management**: Angular Signals (no RxJS)
- **Change Detection**: Zoneless compatible (no `zone.js` dependency)
- **Touch/Swipe**: `@mintplayer/ng-swiper` library
- **Styling**: Bootstrap 5 CSS classes
- **Animations**: Angular Animations (@angular/animations)

---

## Functional Requirements

### 1. Animation Modes

The carousel must support three animation types via an `animation` input:

| Mode | Description |
|------|-------------|
| `slide` | Slides transition horizontally or vertically with CSS transform/margin animations |
| `fade` | Slides cross-fade using opacity transitions |
| `none` | Instant transition without animation |

```typescript
animation = input<'fade' | 'slide' | 'none'>('slide');
```

### 2. Orientation Modes

The carousel must support two orientations via an `orientation` input:

| Mode | Description |
|------|-------------|
| `horizontal` | Slides move left/right, arrows on sides |
| `vertical` | Slides move up/down, arrows on top/bottom |

```typescript
orientation = input<'horizontal' | 'vertical'>('horizontal');
```

### 3. State Management with Signals

All reactive state must use Angular signals. No RxJS Observables or Subjects.

**Required signals:**

```typescript
// Internal state
currentIndex = signal<number>(0);
images = signal<QueryList<BsCarouselImageDirective> | null>(null);
isAnimating = signal<boolean>(false);

// Computed values
imageCount = computed(() => this.images()?.length ?? 0);
currentSlideHeight = computed(() => /* height calculation */);
maxSlideHeight = computed(() => /* max height calculation */);
```

### 4. Standalone Component

The component and all related directives must use `standalone: true`:

```typescript
@Component({
  selector: 'bs-carousel',
  standalone: true,
  imports: [CommonModule, BsSwiperModule, ...],
  ...
})
export class BsCarouselComponent { }
```

### 4a. Zoneless Compatibility

The component must be fully compatible with Angular's zoneless change detection (`provideExperimentalZonelessChangeDetection()`).

**Requirements:**
- No reliance on `zone.js` for change detection
- No use of `ChangeDetectorRef.detectChanges()` or `markForCheck()`
- All state changes must flow through signals, which automatically trigger change detection
- Use `effect()` for side effects that need to run when signals change
- Animations must work without zone.js

**Prohibited patterns:**
```typescript
// DO NOT USE
this.cdRef.detectChanges();
this.cdRef.markForCheck();
NgZone.run(() => { ... });
setTimeout(() => { ... }); // for triggering CD
```

**Allowed patterns:**
```typescript
// USE SIGNALS
this.currentIndex.set(newValue);  // Automatically triggers CD
this.currentIndex.update(v => v + 1);

// USE EFFECTS FOR SIDE EFFECTS
effect(() => {
  const index = this.currentIndex();
  // Side effect runs automatically when index changes
});
```

### 5. NoScript Support (JavaScript Disabled)

When JavaScript is disabled, the carousel must remain functional using pure CSS/HTML:

**Implementation approach:**
- Use hidden radio inputs for each slide
- Use CSS `:checked` selector to show/hide slides
- Use `<label>` elements for prev/next controls that target radio inputs
- Server-side rendering (`isPlatformServer`) detection to render the noscript version

```html
<!-- Server-side / noscript version -->
@for (image of images(); track image.id; let i = $index) {
  <input type="radio" [id]="'carousel-' + i" name="carousel-nav"
         class="d-none" [checked]="i === 0">
  <div class="carousel-item">
    <!-- slide content -->
  </div>
  <label class="carousel-control-prev" [for]="'carousel-' + prevIndex(i)">
  <label class="carousel-control-next" [for]="'carousel-' + nextIndex(i)">
}
```

### 6. Minimal HTML Duplication

- Template content should not be duplicated across animation modes
- Use `ng-template` and `ngTemplateOutlet` for reusable content
- Share common structures between noscript and JavaScript versions where possible

**Structure:**
```html
<!-- Shared slide template -->
<ng-template #slideContent let-image>
  <ng-container [ngTemplateOutlet]="image.itemTemplate"></ng-container>
</ng-template>

<!-- Reuse in both modes -->
```

### 7. Carousel Indicators

Optional indicator dots/bars via an `indicators` input:

```typescript
indicators = input<boolean>(false);
```

**Behavior:**
- Show clickable indicators below (horizontal) or beside (vertical) the slides
- Active indicator is highlighted
- Clicking an indicator navigates to that slide

---

## Interaction Requirements

### 8. Desktop Navigation

On desktop devices (non-touch):

| Control | Behavior |
|---------|----------|
| Previous arrow button | Navigate to previous slide |
| Next arrow button | Navigate to next slide |
| Indicator click | Navigate to specific slide |
| Keyboard arrows | Navigate (if `keyboardEvents` enabled) |

**Touch/swipe events should NOT trigger navigation on desktop.**

### 9. Mobile Navigation

On mobile/touch devices:

| Control | Behavior |
|---------|----------|
| Previous arrow button | Navigate to previous slide |
| Next arrow button | Navigate to next slide |
| Swipe left/up | Navigate to next slide |
| Swipe right/down | Navigate to previous slide |
| Indicator tap | Navigate to specific slide |

### 10. Touch Event Handling

On mobile devices, touch events must call `preventDefault()` and `stopPropagation()`:

```typescript
@HostListener('touchstart', ['$event'])
onTouchStart(ev: TouchEvent) {
  ev.preventDefault();
  ev.stopPropagation();
  // ... handle touch start
}

@HostListener('touchmove', ['$event'])
onTouchMove(ev: TouchEvent) {
  ev.preventDefault();
  ev.stopPropagation();
  // ... handle touch move
}
```

**Rationale:**
- Prevents page scrolling while swiping the carousel
- Prevents event bubbling to parent elements
- Ensures smooth swipe animations without interference

---

## Height Behavior

### 11. Horizontal Mode Height

In horizontal mode, the carousel height should match the current slide's image height:

```typescript
// Height updates AFTER animation completes
currentSlideHeight = computed(() => {
  const slideSizes = this.slideSizes();
  const index = this.currentIndex();
  return slideSizes[index]?.height ?? 'auto';
});
```

**Timing:** Height change occurs after the slide animation completes to avoid jarring layout shifts during animation.

### 12. Vertical Mode Height

In vertical mode, all slides must have the same height equal to the tallest slide:

```typescript
maxSlideHeight = computed(() => {
  const slideSizes = this.slideSizes();
  const heights = slideSizes.map(s => s?.height ?? 0);
  return Math.max(...heights);
});

slideHeight = computed(() => {
  const orientation = this.orientation();
  return orientation === 'vertical' ? this.maxSlideHeight() : null;
});
```

---

## ng-swiper Library Integration

### 13. Library Updates Required

The `@mintplayer/ng-swiper` library must be updated to:

1. **Convert to signals**: Replace all RxJS Observables with Angular signals
2. **Add stopPropagation**: Call `ev.stopPropagation()` on touch events
3. **Standalone support**: Ensure all directives use `standalone: true`
4. **Animation mode awareness**: Support `none` animation mode (instant transition)

### 14. Swiper Directive Updates

```typescript
// BsSwipeDirective updates
@HostListener('touchstart', ['$event'])
onTouchStart(ev: TouchEvent) {
  ev.preventDefault();
  ev.stopPropagation();  // ADD THIS
  // ... existing logic
}

@HostListener('touchmove', ['$event'])
onTouchMove(ev: TouchEvent) {
  ev.preventDefault();      // ADD THIS
  ev.stopPropagation();     // ADD THIS
  // ... existing logic
}

@HostListener('touchend', ['$event'])
onTouchEnd(ev: TouchEvent) {
  ev.stopPropagation();     // ADD THIS
  // ... existing logic
}
```

### 15. Swiper Container Signal Conversion

Convert from Observables to signals:

```typescript
// Before (RxJS)
imageIndex$ = new BehaviorSubject<number>(0);
currentSlideHeight$ = this.imageIndex$.pipe(...);

// After (Signals)
imageIndex = signal<number>(0);
currentSlideHeight = computed(() => {
  const index = this.imageIndex();
  // ... calculation
});
```

---

## Component API

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `animation` | `'fade' \| 'slide' \| 'none'` | `'slide'` | Animation type between slides |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Slide direction |
| `indicators` | `boolean` | `false` | Show indicator dots |
| `keyboardEvents` | `boolean` | `true` | Enable keyboard navigation |
| `interval` | `number \| null` | `null` | Auto-advance interval (ms), null = disabled |
| `wrap` | `boolean` | `true` | Wrap around at ends |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `slideChange` | `EventEmitter<number>` | Emits when slide changes |
| `animationStart` | `EventEmitter<void>` | Emits when animation starts |
| `animationEnd` | `EventEmitter<void>` | Emits when animation ends |

### Methods

| Method | Description |
|--------|-------------|
| `next()` | Navigate to next slide |
| `previous()` | Navigate to previous slide |
| `goto(index: number)` | Navigate to specific slide |

---

## File Structure

```
libs/mintplayer-ng-bootstrap/carousel/
├── src/
│   ├── index.ts
│   ├── carousel.module.ts           # For non-standalone usage
│   ├── carousel/
│   │   ├── carousel.component.ts
│   │   ├── carousel.component.html
│   │   └── carousel.component.scss
│   ├── carousel-image/
│   │   └── carousel-image.directive.ts
│   └── carousel-img/
│       └── carousel-img.directive.ts
├── index.ts
└── ng-package.json

libs/mintplayer-ng-swiper/
├── swiper/
│   └── src/
│       └── directives/
│           ├── swipe-container/
│           │   └── swipe-container.directive.ts  # Update to signals
│           └── swipe/
│               └── swipe.directive.ts            # Add stopPropagation
└── observe-size/
    └── src/
        └── size.ts                               # Update to signals
```

---

## CSS Requirements

### Horizontal Mode
```scss
.carousel {
  position: relative;
  overflow: hidden;
}

.carousel-inner {
  display: flex;
  transition: transform 0.5s ease;
}

.carousel-item {
  flex: 0 0 100%;
  min-width: 100%;
}
```

### Vertical Mode
```scss
.carousel-vertical {
  .carousel-inner {
    flex-direction: column;
  }

  .carousel-control-prev,
  .carousel-control-next {
    // Position at top/bottom instead of left/right
  }

  .carousel-indicators {
    // Position vertically
  }
}
```

### NoScript Styles
```scss
// Show only the checked slide
.car-radio:checked + .carousel-item {
  display: block;
  opacity: 1;
}

// Hide unchecked slides
.carousel-item {
  display: none;
  opacity: 0;
}
```

---

## Testing Requirements

1. **Unit Tests**
   - Animation mode switching
   - Orientation switching
   - Signal state updates
   - Touch event handling (mocked)

2. **Integration Tests**
   - Full carousel navigation flow
   - Keyboard navigation
   - Indicator clicks

3. **E2E Tests**
   - Touch/swipe gestures (on touch-enabled browsers)
   - NoScript functionality
   - Responsive behavior

---

## Accessibility Requirements

- `aria-label` on navigation buttons
- `aria-current` on active indicator
- Keyboard navigation support (arrow keys)
- Focus management during navigation
- Screen reader announcements for slide changes

---

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- iOS Safari (latest 2 versions)
- Chrome for Android (latest 2 versions)

---

## Implementation Checklist

> **Note:** Existing carousel and swiper code may be overwritten or removed during implementation.

- [ ] Update `@mintplayer/ng-swiper` to use signals instead of RxJS
- [ ] Add `stopPropagation()` to swiper touch events
- [ ] Convert swiper directives to `standalone: true`
- [ ] Ensure swiper is zoneless compatible (remove ChangeDetectorRef usage)
- [ ] Add `animation: 'none'` mode to carousel
- [ ] Update carousel component to use pure signals
- [ ] Convert carousel component to `standalone: true`
- [ ] Ensure carousel is zoneless compatible (remove ChangeDetectorRef usage)
- [ ] Implement noscript support with CSS radio buttons
- [ ] Implement height behavior for horizontal/vertical modes
- [ ] Add comprehensive unit tests
- [ ] Test with `provideExperimentalZonelessChangeDetection()`
- [ ] Update demo application
- [ ] Update library documentation
