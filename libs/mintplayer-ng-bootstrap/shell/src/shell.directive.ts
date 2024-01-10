import { Overlay } from '@angular/cdk/overlay';
import { AnimationBuilder, state, transition, style, animate, AnimationPlayer, AnimationFactory } from '@angular/animations';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, HostBinding, Inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsShellState } from './shell-state';

@Directive({
  selector: '[bsShell]',
})
export class BsShellDirective implements AfterViewInit {
  constructor(private template: TemplateRef<any>, private overlay: Overlay, private vcRef: ViewContainerRef, @Inject(DOCUMENT) doc: any, private animationBuilder: AnimationBuilder) {
    const bodyElement = (<Document>doc).querySelector<HTMLBodyElement>('html > body');
    if (!bodyElement) {
      throw 'No body element found';
    }

    this.bodyElement = bodyElement;
    this.openBodyAnimation = this.animationBuilder.build([
      style({ 'margin-left': '0' }),
      animate(this.duration, style({ 'margin-left': '300px' })),
    ]);
    this.closeBodyAnimation = this.animationBuilder.build([
      style({ 'margin-left': '300px' }),
      animate(this.duration, style({ 'margin-left': '0' })),
    ]);
    this.openSidebarAnimation = this.animationBuilder.build([
      style({ transform: 'translateX(-100%)' }),
      animate(this.duration, style({ transform: 'translateX(0)' })),
    ]);
    this.closeSidebarAnimation = this.animationBuilder.build([
      style({ transform: 'translateX(0)' }),
      animate(this.duration, style({ transform: 'translateX(-100%)' })),
    ]);
  }

  bodyElement: HTMLBodyElement;
  sidebarElement?: HTMLElement;
  openBodyAnimation: AnimationFactory;
  closeBodyAnimation: AnimationFactory;
  openSidebarAnimation: AnimationFactory;
  closeSidebarAnimation: AnimationFactory;
  shellState$ = new BehaviorSubject<BsShellState>('auto');
  @Input('bsShell') public set shellState(value: BsShellState) {
    this.shellState$.next(value);
    switch (value) {
      case 'show':
        if (this.sidebarElement) {
          const openBodyPlayer = this.openBodyAnimation.create(this.bodyElement);
          const openSidebarPlayer = this.openSidebarAnimation.create(this.sidebarElement);
          openSidebarPlayer.onDone(() => {

          });
          openSidebarPlayer.play();
          openBodyPlayer.play();
        }
        break;
      case 'hide':
        if (this.sidebarElement) {
          const closeBodyPlayer = this.closeBodyAnimation.create(this.bodyElement);
          const closeSidebarPlayer = this.closeSidebarAnimation.create(this.sidebarElement);
          closeSidebarPlayer.onDone(() => {

          });
          closeSidebarPlayer.play();
          closeBodyPlayer.play();
        }
        break;
      default:
        break;
    }
  }

  duration = 300;

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
      this.sidebarElement.classList.add('position-absolute');
      this.sidebarElement.style.top = '0';
      this.sidebarElement.style.transform = 'translateX(-100%)';
    }
  }
}
