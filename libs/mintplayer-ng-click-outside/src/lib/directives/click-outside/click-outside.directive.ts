import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, effect, inject, input, OnDestroy, OnInit, output, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
})
export class ClickOutsideDirective implements OnInit, OnDestroy {

  readonly clickOutsideEnabled = input(true);

  readonly attachOutsideOnClick = input(false);
  readonly delayClickOutsideInit = input(false);
  readonly emitOnBlur = input(false);

  /** Elements whose clicks do not count as outside. Read at click time, so it is always current. */
  readonly exclude = input<HTMLElement[]>([]);

  /** Comma-separated DOM event names that count as a click (default `click`). */
  readonly clickOutsideEvents = input('');

  readonly clickOutside = output<Event>();

  private element = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  private _events: Array<string> = ['click'];
  private _initialized = false;
  /** Every listener of the current configuration is registered with this signal. */
  private _listeners?: AbortController;
  private _timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    this._initOnClickBody = this._initOnClickBody.bind(this);
    this._onClickBody = this._onClickBody.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);

    // Re-register when the configuration changes. The signals are read before the
    // guard so they are tracked from the first run.
    effect(() => {
      this.attachOutsideOnClick();
      this.emitOnBlur();
      this.clickOutsideEvents();

      if (this._initialized && isPlatformBrowser(this.platformId)) {
        this._init();
      }
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) { return; }

    this._init();
    this._initialized = true;
  }

  ngOnDestroy() {
    this._teardown();
  }

  private _init() {
    // A re-init replaces the previous registration outright: without this, a
    // change of event names or of attachOutsideOnClick left the old listeners
    // attached, and each kept emitting.
    this._teardown();
    this._listeners = new AbortController();

    const events = this.clickOutsideEvents();
    this._events = events !== '' ? events.split(',').map(e => e.trim()) : ['click'];

    if (this.attachOutsideOnClick()) {
      this._listen(this.element.nativeElement, this._initOnClickBody);
    } else {
      this._initOnClickBody();
    }

    if (this.emitOnBlur()) {
      window.addEventListener('blur', this._onWindowBlur, { signal: this._listeners.signal });
    }
  }

  private _teardown() {
    this._listeners?.abort();
    this._listeners = undefined;
    this._timers.forEach(clearTimeout);
    this._timers.clear();
  }

  private _initOnClickBody() {
    if (this.delayClickOutsideInit()) {
      this._later(() => this._initClickOutsideListener());
    } else {
      this._initClickOutsideListener();
    }
  }

  private _onClickBody(ev: Event) {
    if (!this.clickOutsideEnabled()) { return; }

    if (!this.element.nativeElement.contains(ev.target) && !!ev.target && !this._shouldExclude(ev.target)) {
      this._emit(ev);

      if (this.attachOutsideOnClick()) {
        this._removeClickOutsideListener();
      }
    }
  }

  /**
   * Resolves problem with outside click on iframe
   * @see https://github.com/arkon/ng-click-outside/issues/32
   */
  private _onWindowBlur(ev: Event) {
    this._later(() => {
      if (!document.hidden) {
        this._emit(ev);
      }
    });
  }

  private _emit(ev: Event) {
    if (!this.clickOutsideEnabled()) { return; }

    this.clickOutside.emit(ev);
  }

  private _shouldExclude(target: EventTarget): boolean {
    return this.exclude().some(excludedNode => excludedNode.contains(<Node>target));
  }

  private _initClickOutsideListener() {
    this._listen(document, this._onClickBody);
  }

  private _removeClickOutsideListener() {
    this._events.forEach(e => document.removeEventListener(e, this._onClickBody));
  }

  private _listen(target: EventTarget, handler: (ev: Event) => void) {
    const signal = this._listeners?.signal;
    if (!signal) { return; }
    this._events.forEach(e => target.addEventListener(e, handler, { signal }));
  }

  /** A timer that teardown cancels, so nothing registers or emits after destroy. */
  private _later(fn: () => void) {
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      fn();
    });
    this._timers.add(timer);
  }

}
