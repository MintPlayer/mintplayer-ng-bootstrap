import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, Input, Renderer2, RendererFactory2, TemplateRef, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsShellState } from './shell-state';

@Directive({
  selector: '[bsShell]',
})
export class BsShellDirective implements AfterViewInit {
  constructor(private template: TemplateRef<any>, private overlay: Overlay, private vcRef: ViewContainerRef, @Inject(DOCUMENT) doc: any, private element: ElementRef, rendererFactory: RendererFactory2) {
    const docu = <Document>doc;
    this.renderer = rendererFactory.createRenderer(element.nativeElement, null);
    if (!BsShellDirective.bodyElement) {
      const bodyElement = (<Document>doc).querySelector<HTMLBodyElement>('html > body');
      if (!bodyElement) {
        throw 'No body element found';
      }
      BsShellDirective.bodyElement = bodyElement;
    }
    if (!BsShellDirective.styleTag) {
      const styleTag = BsShellDirective.styleTag = <HTMLStyleElement>this.renderer.createElement('style');
      styleTag.innerHTML = `.bs-shell-sidebar{transform:translateX(-100%);transition:transform linear 300ms;top:0}.bs-shell-sidebar.show{transform:translateX(0)}html>body{margin-left:0;transition:margin-left linear 300ms}html>body.sidebar-show{margin-left:${this.size}px}`;
      this.renderer.appendChild(docu.head, styleTag);
    }
  }

  size = 300;
  renderer: Renderer2;
  static bodyElement: HTMLBodyElement;
  sidebarElement?: HTMLElement;
  shellState$ = new BehaviorSubject<BsShellState>('auto');
  @Input('bsShell') public set shellState(value: BsShellState) {
    this.shellState$.next(value);
    switch (value) {
      case 'show':
        if (this.sidebarElement) {
          this.renderer.addClass(this.sidebarElement, 'show');
          this.renderer.addClass(BsShellDirective.bodyElement, 'sidebar-show');
        }
        break;
      case 'hide':
        if (this.sidebarElement) {
          this.renderer.removeClass(this.sidebarElement, 'show');
          this.renderer.removeClass(BsShellDirective.bodyElement, 'sidebar-show');
        }
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
