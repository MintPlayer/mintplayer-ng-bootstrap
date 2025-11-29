import { OverlayRef } from '@angular/cdk/overlay';
import { ComponentRef, EmbeddedViewRef } from '@angular/core';

export interface OverlayHandle<T> {
  overlayRef: OverlayRef;
  componentRef?: ComponentRef<T>;
  viewRef?: EmbeddedViewRef<any>;
  dispose(): void;
  updatePosition(): void;
}
