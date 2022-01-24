import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, EventEmitter, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, SimpleChanges } from '@angular/core';

@Directive({ selector: '[clickOutside]' })
export class ClickOutsideDirective implements OnInit, OnChanges, OnDestroy {

  @Input() clickOutsideEnabled = true;

  @Input() attachOutsideOnClick = false;
  @Input() delayClickOutsideInit = false;
  @Input() emitOnBlur = false;

  @Input() exclude: HTMLElement[] = [];
  @Input() excludeBeforeClick = false;

  @Input() clickOutsideEvents = '';

  @Output() clickOutside: EventEmitter<Event> = new EventEmitter<Event>();

  private _nodesExcluded: Array<HTMLElement> = [];
  private _events: Array<string> = ['click'];

  constructor(
      private element: ElementRef,
      private zone: NgZone,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this._initOnClickBody = this._initOnClickBody.bind(this);
    this._onClickBody = this._onClickBody.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) { return; }

    this._init();
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) { return; }

    this._removeClickOutsideListener();
    this._removeAttachOutsideOnClickListener();
    this._removeWindowBlurListener();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!isPlatformBrowser(this.platformId)) { return; }

    if (changes['attachOutsideOnClick'] || changes['exclude'] || changes['emitOnBlur']) {
      this._init();
    }
  }

  private _init() {
    if (this.clickOutsideEvents !== '') {
      this._events = this.clickOutsideEvents.split(',').map(e => e.trim());
    }

    this._excludeCheck();

    if (this.attachOutsideOnClick) {
      this._initAttachOutsideOnClickListener();
    } else {
      this._initOnClickBody();
    }

    if (this.emitOnBlur) {
      this._initWindowBlurListener();
    }
  }

  private _initOnClickBody() {
    if (this.delayClickOutsideInit) {
      setTimeout(this._initClickOutsideListener.bind(this));
    } else {
      this._initClickOutsideListener();
    }
  }

  private _excludeCheck() {
    if (this.exclude) {
      try {
        const nodes = this.exclude;
        if (nodes) {
          this._nodesExcluded = nodes;
        }
      } catch (err) {
        console.error('[ng-click-outside] Check your exclude selector syntax.', err);
      }
    }
  }

  private _onClickBody(ev: Event) {
    if (!this.clickOutsideEnabled) { return; }

    if (this.excludeBeforeClick) {
      this._excludeCheck();
    }

    if (!this.element.nativeElement.contains(ev.target) && !!ev.target && !this._shouldExclude(ev.target)) {
      this._emit(ev);

      if (this.attachOutsideOnClick) {
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
    if (!this.clickOutsideEnabled) { return; }

    this.zone.run(() => this.clickOutside.emit(ev));
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
    this.zone.runOutsideAngular(() => {
      this._events.forEach(e => document.addEventListener(e, this._onClickBody));
    });
  }

  private _removeClickOutsideListener() {
    this.zone.runOutsideAngular(() => {
      this._events.forEach(e => document.removeEventListener(e, this._onClickBody));
    });
  }

  private _initAttachOutsideOnClickListener() {
    this.zone.runOutsideAngular(() => {
      this._events.forEach(e => this.element.nativeElement.addEventListener(e, this._initOnClickBody));
    });
  }

  private _removeAttachOutsideOnClickListener() {
    this.zone.runOutsideAngular(() => {
      this._events.forEach(e => this.element.nativeElement.removeEventListener(e, this._initOnClickBody));
    });
  }

  private _initWindowBlurListener() {
    this.zone.runOutsideAngular(() => {
      window.addEventListener('blur', this._onWindowBlur);
    });
  }

  private _removeWindowBlurListener() {
    this.zone.runOutsideAngular(() => {
      window.removeEventListener('blur', this._onWindowBlur);
    });
  }

}