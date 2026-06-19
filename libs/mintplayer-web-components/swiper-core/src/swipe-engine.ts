import {
  DEFAULT_SWIPE_CONFIG,
  LastTouch,
  StartTouch,
  SwipeAnimationHandle,
  SwipeEngineCallbacks,
  SwipeEngineConfig,
  SwipeEngineHost,
  SwipeSlideState,
  SwipeTrackOffset,
} from './models';

/**
 * Framework-agnostic swipe / slide engine.
 *
 * Owns everything that is identical across frameworks: pointer gesture math,
 * the 3px direction-lock that prevents Firefox-Android pull-to-refresh from
 * stealing a horizontal drag, the slide-index state machine (next / previous /
 * goto with wraparound and offside-clone accounting), the margin-offset
 * computation, and keyboard mapping. It holds plain state — no Angular
 * signals, no Lit reactivity — so it is fully unit-testable without a DOM.
 *
 * The host supplies the small, genuinely environment-specific surface via
 * {@link SwipeEngineHost}: writing margins to the track, measuring the
 * container, and playing a margin transition (the Lit WC uses the Web
 * Animations API; the Angular adapter keeps `AnimationBuilder`). Outbound
 * notifications go through {@link SwipeEngineCallbacks}.
 *
 * Lifecycle: construct → feed config/slides/size → call {@link markReady} once
 * the track is laid out → forward pointer/keyboard input → {@link destroy}.
 */
export class SwipeEngine {
  // 3px (not a larger threshold) so preventDefault() can fire on the first or
  // second move — Firefox Android's APZ can otherwise claim a downward gesture
  // as pull-to-refresh before our handler arbitrates the direction.
  private static readonly SWIPE_THRESHOLD = 3;
  // Mirrors the original 20ms gap between touchstart and committing the start
  // position, which lets a tap settle before a drag is recognised.
  private static readonly START_DELAY_MS = 20;
  private static readonly ANIMATION_MS = 500;

  private config: SwipeEngineConfig;

  private imageIndex = 0;
  private slides: SwipeSlideState[] = [];
  private containerSize: { width: number; height: number } | null = null;

  private isViewInited = false;
  private isAnimating = false;
  private isDestroyed = false;

  private startTouch: StartTouch | null = null;
  private lastTouch: LastTouch | null = null;
  private isSwipeDetected = false;
  // Synchronous copy of the start position, available during the START_DELAY_MS
  // gap before `startTouch` is committed, so direction-lock can engage (and
  // preventDefault fire) on the earliest move events.
  private touchStartPos: { x: number; y: number } | null = null;

  private pendingHandle: SwipeAnimationHandle | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private gotoTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly host: SwipeEngineHost,
    private readonly callbacks: SwipeEngineCallbacks = {},
    config: Partial<SwipeEngineConfig> = {},
  ) {
    this.config = { ...DEFAULT_SWIPE_CONFIG, ...config };
  }

  // ---- inbound state -------------------------------------------------------

  /** Merge new configuration (orientation / animation / etc.) and re-render. */
  setConfig(config: Partial<SwipeEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }

  /** Replace the slide set (including offside clones) and re-render. */
  setSlides(slides: SwipeSlideState[]): void {
    this.slides = slides;
    this.render();
  }

  /** Update the observed container size (used to convert a drag delta to %). */
  setContainerSize(width: number, height: number): void {
    this.containerSize = { width, height };
    this.render();
  }

  /** Signal that the track is laid out; before this, offsets snap to index. */
  markReady(): void {
    this.isViewInited = true;
    this.render();
  }

  /** Set the active slide with no animation (e.g. a programmatic/initial value). */
  setIndex(index: number): void {
    if (index === this.imageIndex) return;
    this.imageIndex = index;
    this.callbacks.onIndexChange?.(index);
    this.render();
  }

  getIndex(): number {
    return this.imageIndex;
  }

  // ---- derived state -------------------------------------------------------

  get touchAction(): 'pan-x' | 'pan-y' {
    return this.config.orientation === 'horizontal' ? 'pan-y' : 'pan-x';
  }

  /** `aria-keyshortcuts` value, or `null` when keyboard handling is off. */
  get ariaKeyshortcuts(): string | null {
    if (!this.config.keyboardEvents) return null;
    return this.config.orientation === 'horizontal'
      ? 'ArrowLeft ArrowRight Home End'
      : 'ArrowUp ArrowDown Home End';
  }

  /** Non-offside (navigable) slides. */
  private actualSlides(): SwipeSlideState[] {
    return this.slides.filter((s) => !s.offside);
  }

  private padLeft(): number {
    if (this.slides.length === 0) return 1;
    let count = 0;
    for (const s of this.slides) {
      if (!s.offside) break;
      count++;
    }
    return count;
  }

  private padRight(): number {
    if (this.slides.length === 0) return 1;
    let count = 0;
    for (let i = this.slides.length - 1; i >= 0; i--) {
      if (!this.slides[i].offside) break;
      count++;
    }
    return count;
  }

  private maxSlideHeight(): number {
    const heights = this.actualSlides().map((s) => s.height || 1);
    return heights.length ? Math.max(...heights) : 1;
  }

  /** Current track offset, in percent of one slide, including live drag delta. */
  private offset(): number {
    const { orientation } = this.config;
    if (!this.isViewInited) {
      return -this.imageIndex * 100;
    }
    if (this.startTouch && this.lastTouch) {
      const containerLength =
        orientation === 'horizontal'
          ? this.containerSize?.width ?? this.host.getContainerLength()
          : this.maxSlideHeight();
      if (containerLength === 0) {
        return -this.imageIndex * 100;
      }
      const delta =
        orientation === 'horizontal'
          ? this.lastTouch.position.x - this.startTouch.position.x
          : this.lastTouch.position.y - this.startTouch.position.y;
      return -this.imageIndex * 100 + (delta / containerLength) * 100;
    }
    return -this.imageIndex * 100;
  }

  private offsetPrimary(): number {
    return this.offset() - this.padLeft() * 100;
  }

  private offsetSecondary(): number {
    return -(this.offset() - this.padLeft() * 100) - (this.padRight() - 1) * 100;
  }

  /**
   * Height the host should give the viewport: the tallest slide in vertical
   * mode, the current slide in horizontal. `null` until measurements settle
   * (>10px) so the viewport never collapses mid-load.
   */
  currentSlideHeight(): number | null {
    const heights = this.actualSlides().map((s) => s.height || 0);
    const maxHeight = heights.length ? Math.max(...heights) : 0;
    const currHeight = this.actualSlides()[this.imageIndex]?.height ?? maxHeight;
    const result = this.config.orientation === 'vertical' ? maxHeight : currHeight;
    return result > 10 ? result : null;
  }

  // ---- render --------------------------------------------------------------

  /**
   * Push the resting margin offsets to the host. No-op while an animation owns
   * the margins. In `fade` mode the offsets stay `null` (CSS positions slides).
   */
  private render(): void {
    this.callbacks.onRender?.();
    if (this.isAnimating) return;

    const offset: SwipeTrackOffset = {
      marginLeftPercent: null,
      marginRightPercent: null,
      marginTopPx: null,
      marginBottomPx: null,
    };

    if (this.config.animation === 'fade') {
      this.host.applyTrackOffset(offset);
      return;
    }

    const primary = this.offsetPrimary();
    const secondary = this.offsetSecondary();
    if (this.config.orientation === 'horizontal') {
      offset.marginLeftPercent = primary;
      offset.marginRightPercent = secondary;
    } else {
      const h = this.maxSlideHeight();
      offset.marginTopPx = (primary / 100) * h;
      offset.marginBottomPx = (secondary / 100) * h;
    }
    this.host.applyTrackOffset(offset);
  }

  // ---- pointer input -------------------------------------------------------

  /** Begin a gesture at (x, y). Call from touchstart/pointerdown (single touch). */
  pointerDown(x: number, y: number): void {
    this.isSwipeDetected = false;
    this.touchStartPos = { x, y };
    this.pendingHandle?.finish();
    this.clearStartTimer();
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      if (this.isDestroyed) return;
      this.startTouch = { position: { x, y }, timestamp: Date.now() };
      this.lastTouch = { position: { x, y }, isTouching: true };
      this.render();
    }, SwipeEngine.START_DELAY_MS);
  }

  /**
   * Continue a gesture. Returns `true` when the engine has locked onto its axis
   * and the caller should `preventDefault()` (to stop native scroll / PTR).
   */
  pointerMove(x: number, y: number): boolean {
    const refPos = this.startTouch?.position ?? this.touchStartPos;
    let prevent = false;
    if (refPos) {
      const dx = Math.abs(x - refPos.x);
      const dy = Math.abs(y - refPos.y);
      const primary = this.config.orientation === 'horizontal' ? dx : dy;
      const perpendicular = this.config.orientation === 'horizontal' ? dy : dx;
      if (!this.isSwipeDetected && primary > SwipeEngine.SWIPE_THRESHOLD && primary >= perpendicular) {
        this.isSwipeDetected = true;
      }
      prevent = this.isSwipeDetected;
    }
    this.lastTouch = { position: { x, y }, isTouching: true };
    this.render();
    return prevent;
  }

  /**
   * End a gesture. Commits a slide change if the drag exceeded `minimumOffset`.
   * Returns `true` when the caller should `preventDefault()` on touchend.
   */
  pointerUp(): boolean {
    const prevent = this.isSwipeDetected;
    this.touchStartPos = null;
    // A release before the start delay elapsed is a tap, not a swipe: drop the
    // pending commit so a phantom startTouch isn't set after the finger lifts.
    if (this.startTimer) {
      this.clearStartTimer();
      this.isSwipeDetected = false;
      return false;
    }
    const start = this.startTouch;
    const last = this.lastTouch;
    if (start && last) {
      const distance =
        this.config.orientation === 'horizontal'
          ? last.position.x - start.position.x
          : last.position.y - start.position.y;
      this.onSwipe(distance);
    }
    return prevent;
  }

  private onSwipe(distance: number): void {
    const idx = this.imageIndex;
    const total = this.actualSlides().length || 1;
    const newIndex =
      Math.abs(distance) < this.config.minimumOffset ? idx : idx + (distance < 0 ? 1 : -1);
    this.animateToIndex(idx, newIndex, distance, total);
  }

  // ---- keyboard ------------------------------------------------------------

  /**
   * Map a key to navigation. Returns `true` when the key was consumed (the
   * caller should then `preventDefault()`), `false` otherwise — so a
   * cross-axis arrow still scrolls the page.
   */
  onKeyPress(key: string): boolean {
    if (!this.config.keyboardEvents) return false;
    const horizontal = this.config.orientation === 'horizontal';
    switch (key) {
      case 'ArrowLeft':
        if (horizontal) { this.previous(); return true; }
        return false;
      case 'ArrowRight':
        if (horizontal) { this.next(); return true; }
        return false;
      case 'ArrowUp':
        if (!horizontal) { this.previous(); return true; }
        return false;
      case 'ArrowDown':
        if (!horizontal) { this.next(); return true; }
        return false;
      case 'Home':
        this.goto(0); return true;
      case 'End':
        this.goto(Math.max(0, this.actualSlides().length - 1)); return true;
      default:
        return false;
    }
  }

  // ---- navigation ----------------------------------------------------------

  previous(): void {
    this.gotoAnimate(-1, 'relative');
  }

  next(): void {
    this.gotoAnimate(1, 'relative');
  }

  goto(index: number): void {
    this.gotoAnimate(index, 'absolute');
  }

  private gotoAnimate(index: number, type: 'absolute' | 'relative'): void {
    this.pendingHandle?.finish();
    this.clearGotoTimer();
    this.gotoTimer = setTimeout(() => {
      this.gotoTimer = null;
      if (this.isDestroyed) return;
      this.pendingHandle?.finish();
      const total = this.actualSlides().length || 1;
      const target = type === 'relative' ? this.imageIndex + index : index;
      this.animateToIndex(this.imageIndex, target, 0, total);
    }, SwipeEngine.START_DELAY_MS);
  }

  private animateToIndex(oldIndex: number, newIndex: number, distance: number, totalSlides: number): void {
    const { animation, orientation } = this.config;
    this.callbacks.onAnimationStart?.();

    if (animation === 'none') {
      this.commitIndex(newIndex, totalSlides);
      this.clearTouches();
      this.callbacks.onAnimationEnd?.();
      return;
    }

    if (animation === 'fade') {
      // Opacity is driven by the host's CSS (.active + transition). Commit the
      // index now and time animationEnd to roughly match the CSS duration.
      this.clearFadeTimer();
      this.commitIndex(newIndex, totalSlides);
      this.clearTouches();
      this.fadeTimer = setTimeout(() => {
        this.fadeTimer = null;
        if (!this.isDestroyed) this.callbacks.onAnimationEnd?.();
      }, SwipeEngine.ANIMATION_MS);
      return;
    }

    // slide
    this.isAnimating = true;
    // Hand the active-axis margins to the animation.
    this.host.applyTrackOffset({
      marginLeftPercent: null,
      marginRightPercent: null,
      marginTopPx: null,
      marginBottomPx: null,
    });

    const containerLength = this.host.getContainerLength();
    this.pendingHandle = this.host.runAnimation(
      {
        orientation,
        fromPrimaryPx: -(oldIndex + 1) * containerLength + distance,
        fromSecondaryPx: (oldIndex + 1) * containerLength - distance,
        toPrimaryPx: -(newIndex + 1) * containerLength,
        toSecondaryPx: (newIndex + 1) * containerLength,
        durationMs: SwipeEngine.ANIMATION_MS,
      },
      () => {
        if (this.isDestroyed) return;
        this.pendingHandle = null;
        this.isAnimating = false;
        this.commitIndex(newIndex, totalSlides);
        this.clearTouches();
        this.callbacks.onAnimationEnd?.();
      },
    );
  }

  /** Resolve a (possibly out-of-range) target into a wrapped index and emit it. */
  private commitIndex(newIndex: number, totalSlides: number): void {
    let resolved: number;
    if (newIndex === -1) {
      resolved = totalSlides - 1;
    } else if (newIndex === totalSlides) {
      resolved = 0;
    } else {
      resolved = newIndex;
    }
    if (resolved !== this.imageIndex) {
      this.imageIndex = resolved;
      this.callbacks.onIndexChange?.(resolved);
    }
    this.render();
  }

  private clearTouches(): void {
    this.startTouch = null;
    this.lastTouch = null;
  }

  private clearStartTimer(): void {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  private clearGotoTimer(): void {
    if (this.gotoTimer) {
      clearTimeout(this.gotoTimer);
      this.gotoTimer = null;
    }
  }

  private clearFadeTimer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.pendingHandle?.cancel();
    this.pendingHandle = null;
    this.clearStartTimer();
    this.clearGotoTimer();
    this.clearFadeTimer();
  }
}
