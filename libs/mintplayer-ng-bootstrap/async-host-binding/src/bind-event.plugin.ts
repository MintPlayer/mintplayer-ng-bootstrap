import { EventManager } from '@angular/platform-browser';
import { Signal, effect, isSignal } from '@angular/core';

export class BsBindEventPlugin {
  manager!: EventManager;

  supports(event: string) {
    return event.startsWith('$.');
  }

  addEventListener(element: HTMLElement, event: string) {
    const el = <any>element;
    el[event] = null;

    const method = this.getMethod(element, event);

    // Use zone's onStable to wait for initialization, then set up effect
    let cleanup: (() => void) | null = null;
    const stableSub = this.manager.getZone().onStable.subscribe(() => {
      stableSub.unsubscribe();

      const value = el[event];
      if (isSignal(value)) {
        // If it's a signal, create an effect to track changes
        const effectRef = effect(() => {
          const v = (value as Signal<unknown>)();
          method(v);
        });
        cleanup = () => effectRef.destroy();
      } else if (value !== null && value !== undefined) {
        // If it's a plain value, just apply it once
        method(value);
      }
    });

    return () => {
      stableSub.unsubscribe();
      cleanup?.();
    };
  }

  private getMethod(element: HTMLElement, event: string) {
    const el = <any>element;
    const [, key, value, unit = ''] = event.split('.');

    if (event.endsWith('.attr')) {
      return (v: unknown) => element.setAttribute(key, String(v));
    }

    if (key === 'class') {
      return (v: unknown) => element.classList.toggle(value, !!v);
    }

    if (key === 'style') {
      return (v: unknown) => element.style.setProperty(value, `${v}${unit}`);
    }

    return (v: unknown) => (el[key] = v);
  }
}