import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy, OnInit, Renderer2, RendererFactory2, TemplateRef, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, map, mergeMap, switchMap, takeUntil, zip } from 'rxjs';
import { BsShellState } from './shell-state';

@Directive({
  selector: '[bsShell]',
})
export class BsShellDirective implements OnInit, OnDestroy, AfterViewInit {
  constructor(private template: TemplateRef<any>, private overlay: Overlay, private vcRef: ViewContainerRef, @Inject(DOCUMENT) doc: any, private element: ElementRef, rendererFactory: RendererFactory2) {
    const docu = <Document>doc;
    this.renderer = rendererFactory.createRenderer(element.nativeElement, null);
    this.shellStyles$ = this.size$.pipe(map((size) => {
      return `
        html>body.sidebar-show {
          margin-left:${size}px;
        }`;
    }));
    if (!BsShellDirective.bodyElement) {
      const bodyElement = (<Document>doc).querySelector<HTMLBodyElement>('html > body');
      if (!bodyElement) {
        throw 'No body element found';
      }
      BsShellDirective.bodyElement = bodyElement;
    }
    if (!BsShellDirective.styleTag) {
      const styleTag = BsShellDirective.styleTag = <HTMLStyleElement>this.renderer.createElement('style');
      this.renderer.appendChild(docu.head, styleTag);

      BsShellDirective.allShellStylesMerged$ = combineLatest([BsShellDirective.allShellStyles$])
        .pipe(switchMap(([allShellStyles]) => combineLatest(allShellStyles).pipe(map((styles) => styles.join('\r\n')))));
      combineLatest([BsShellDirective.allShellStylesMerged$, BsShellDirective.commonStyles$])
        .pipe(map(([allShellStylesMerged, commonStyles]) => commonStyles + '\r\n' + allShellStylesMerged))
        .pipe(takeUntil(BsShellDirective.allDestroyed$))
        .subscribe((styles) => styleTag.innerHTML = styles);
    }
  }

  renderer: Renderer2;
  static bodyElement: HTMLBodyElement;
  static commonStyles$ = new BehaviorSubject<string>(`
    .bs-shell-sidebar {
      transform: translateX(-100%);
      transition:transform linear 300ms;
      top:0;
    }
    .bs-shell-sidebar.show {
      transform:translateX(0);
    }
    html>body {
      margin-left:0;
      transition:margin-left linear 300ms
    }`);
  static allShellStyles$ = new BehaviorSubject<Observable<string>[]>([]);
  static allShellStylesMerged$: Observable<string>;
  static allDestroyed$ = new Subject();

  size$ = new BehaviorSubject<number>(300);
  shellStyles$: Observable<string>;

  ngOnInit() {
    const val = BsShellDirective.allShellStyles$.value;
    val.push(this.shellStyles$);
    BsShellDirective.allShellStyles$.next(val);
  }
  ngOnDestroy() {
    const val = BsShellDirective.allShellStyles$.value;
    val.splice(val.indexOf(this.shellStyles$), 1);
    BsShellDirective.allShellStyles$.next(val);

    if (val.length === 0) {
      BsShellDirective.allDestroyed$.next(true);
      BsShellDirective.styleTag = undefined;
    }
  }

  sidebarElement?: HTMLElement;
  shellState$ = new BehaviorSubject<BsShellState>('auto');
  @Input('bsShell') public set shellState(value: BsShellState) {
    this.shellState$.next(value);
    switch (value) {
      case 'auto':
        this.renderer.removeClass(this.sidebarElement, 'show');
        this.renderer.removeClass(this.sidebarElement, 'hide');
        this.renderer.removeClass(BsShellDirective.bodyElement, 'sidebar-show');
        this.renderer.addClass(BsShellDirective.bodyElement, 'sidebar-auto');
        break;
      case 'show':
        this.renderer.addClass(this.sidebarElement, 'show');
        this.renderer.removeClass(this.sidebarElement, 'hide');
        this.renderer.addClass(BsShellDirective.bodyElement, 'sidebar-show');
        this.renderer.removeClass(BsShellDirective.bodyElement, 'sidebar-auto');
        break;
      case 'hide':
        this.renderer.removeClass(this.sidebarElement, 'show');
        this.renderer.addClass(this.sidebarElement, 'hide');
        this.renderer.removeClass(BsShellDirective.bodyElement, 'sidebar-show');
        this.renderer.removeClass(BsShellDirective.bodyElement, 'sidebar-auto');
        break;
      default:
        break;
    }
  }

  duration = 300;
  static styleTag?: HTMLStyleElement;

  ngAfterViewInit() {
    const overlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: this.overlay.position().global().top('0').bottom('0').left('0'),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });
    const portal = new TemplatePortal(this.template, this.vcRef);
    const viewRef = overlayRef.attach(portal);
    this.sidebarElement = viewRef.rootNodes[0];
    if (this.sidebarElement) {
      this.sidebarElement.classList.add('position-absolute', 'h-100', 'bs-shell-sidebar');
    }
  }
}
