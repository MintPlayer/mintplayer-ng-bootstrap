import { ConnectedPosition, ScrollStrategy } from '@angular/cdk/overlay';
import { ElementRef, InjectionToken, TemplateRef, Type, ViewContainerRef } from '@angular/core';

export type ScrollStrategyType = 'reposition' | 'block' | 'close' | 'noop';

export interface GlobalPositionConfig {
  centerHorizontally?: boolean;
  centerVertically?: boolean;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export interface GlobalOverlayConfig<T> {
  contentComponent: Type<T>;
  contentToken: InjectionToken<TemplateRef<any>>;
  template: TemplateRef<any>;
  globalPosition?: GlobalPositionConfig;
  scrollStrategy?: ScrollStrategyType;
  hasBackdrop?: boolean;
  width?: string;
  cleanupDelay?: number;
}

export interface ConnectedOverlayConfig<T> {
  connectedTo: ElementRef | { getBoundingClientRect: () => DOMRect };
  positions: ConnectedPosition[];
  contentComponent?: Type<T>;
  contentToken?: InjectionToken<TemplateRef<any>>;
  template: TemplateRef<any>;
  viewContainerRef?: ViewContainerRef;
  scrollStrategy?: ScrollStrategyType;
  portalType?: 'component' | 'template';
  hasBackdrop?: boolean;
}
