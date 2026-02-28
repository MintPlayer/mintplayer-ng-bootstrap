import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, effect, inject, input, OnDestroy, OnInit, output, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective implements OnInit, OnDestroy {

  readonly clickOutsideEnabled = input(true);

  readonly attachOutsideOnClick = input(false);
  readonly delayClickOutsideInit = input(false);
  readonly emitOnBlur = input(false);

  readonly exclude = input<HTMLElement[]>([]);
  readonly excludeBeforeClick = input(false);

  readonly clickOutsideEvents = input('');

  readonly clickOutside = output<Event>();

  private element = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  private _nodesExcluded: Array<HTMLElement> = [];
  private _events: Array<string> = ['click'];
  private _initialized = false;

  constructor() {
    this._initOnClickBody = this._initOnClickBody.bind(this);
    this._onClickBody = this._onClickBody.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);

    // Replace ngOnChanges: react to changes in attachOutsideOnClick, exclude, emitOnBlur
    effect(() => {
      // Read the signals to track them
      this.attachOutsideOnClick();
      this.exclude();
      this.emitOnBlur();

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
    if (!isPlatformBrowser(this.platformId)) { return; }

    this._removeClickOutsideListener();
    this._removeAttachOutsideOnClickListener();
    this._removeWindowBlurListener();
  }

  private _init() {
    if (this.clickOutsideEvents() !== '') {
      this._events = this.clickOutsideEvents().split(',').map(e => e.trim());
    }

    this._excludeCheck();

    if (this.attachOutsideOnClick()) {
      this._initAttachOutsideOnClickListener();
    } else {
      this._initOnClickBody();
    }

    if (this.emitOnBlur()) {
      this._initWindowBlurListener();
    }
  }

  private _initOnClickBody() {
    if (this.delayClickOutsideInit()) {
      setTimeout(this._initClickOutsideListener.bind(this));
    } else {
      this._initClickOutsideListener();
    }
  }

  private _excludeCheck() {
    if (this.exclude()) {
      try {
        const nodes = this.exclude();
        if (nodes) {
          this._nodesExcluded = nodes;
        }
      } catch (err) {
        console.error('[ng-click-outside] Check your exclude selector syntax.', err);
      }
    }
  }

  private _onClickBody(ev: Event) {
    if (!this.clickOutsideEnabled()) { return; }

    if (this.excludeBeforeClick()) {
      this._excludeCheck();
    }

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
    setTimeout(() => {
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
    for (const excludedNode of this._nodesExcluded) {
      if (excludedNode.contains(<Node>target)) {
        return true;
      }
    }

    return false;
  }

  private _initClickOutsideListener() {
    this._events.forEach(e => document.addEventListener(e, this._onClickBody));
  }

  private _removeClickOutsideListener() {
    this._events.forEach(e => document.removeEventListener(e, this._onClickBody));
  }

  private _initAttachOutsideOnClickListener() {
    this._events.forEach(e => this.element.nativeElement.addEventListener(e, this._initOnClickBody));
  }

  private _removeAttachOutsideOnClickListener() {
    this._events.forEach(e => this.element.nativeElement.removeEventListener(e, this._initOnClickBody));
  }

  private _initWindowBlurListener() {
    window.addEventListener('blur', this._onWindowBlur);
  }

  private _removeWindowBlurListener() {
    window.removeEventListener('blur', this._onWindowBlur);
  }

}
