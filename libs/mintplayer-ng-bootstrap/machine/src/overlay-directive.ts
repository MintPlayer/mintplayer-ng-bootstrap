import {
  ApplicationRef,
  createComponent,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  EnvironmentInjector,
  inject,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  untracked,
  type ComponentRef,
  type EmbeddedViewRef,
  type Type,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { createBodyHost, removeBodyHost } from '@mintplayer/ui-core/overlay';

/**
 * A structural directive's anchor: the element its template sits in
 * (`<button>Save<span *bsTooltip>…</span></button>` → the button). The
 * directive's own node is a comment; read this lazily, once the view placed it.
 */
export function anchorElement(): () => HTMLElement | null {
  const node = inject<ElementRef<Node>>(ElementRef).nativeElement;
  return () => node.parentElement;
}

/**
 * The Angular half of an overlay directive (#458 M6, tooltip and popover): while
 * `inputs()` is not null, `component` renders into a body host with the
 * directive's template as its content (`<ng-content>`), and gets those inputs.
 * The panel is created detached and attached to the application, so it lives
 * outside every clipping ancestor and the anchor's DOM stays the consumer's.
 * Browser only: an overlay cannot be open in server HTML.
 */
export function useOverlayComponent(component: Type<unknown>, inputs: () => object | null, anchor: () => Element | null): void {
  const template = inject<TemplateRef<unknown>>(TemplateRef);
  const injector = inject(Injector);
  const environmentInjector = inject(EnvironmentInjector);
  const appRef = inject(ApplicationRef);
  const doc = inject(DOCUMENT);
  const id = `mp-overlay-${inject(BsIdService).next('bs-overlay')}`;
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  let panel: ComponentRef<unknown> | null = null;
  let content: EmbeddedViewRef<unknown> | null = null;
  const close = () => {
    panel?.destroy();
    content?.destroy();
    panel = content = null;
    removeBodyHost(doc, id);
  };
  effect(() => {
    const next = inputs();
    untracked(() => {
      if (!next) return close();
      if (!panel) {
        content = template.createEmbeddedView(null, injector);
        appRef.attachView(content);
        panel = createComponent(component, { environmentInjector, elementInjector: injector, projectableNodes: [content.rootNodes] });
        Object.entries(next).map(([name, value]) => panel?.setInput(name, value));
        createBodyHost(doc, id, anchor()).appendChild(panel.location.nativeElement);
        appRef.attachView(panel.hostView);
        return;
      }
      Object.entries(next).map(([name, value]) => panel?.setInput(name, value));
    });
  });
  inject(DestroyRef).onDestroy(close);
}
