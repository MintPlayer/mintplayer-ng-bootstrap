import { EventManager } from '@angular/platform-browser';

export class BsBindEventPlugin {
  manager!: EventManager;

  supports(event: string) {
    return event.startsWith('$.');
  }

  addEventListener(element: HTMLElement, event: string) {
    const el = <any>element;
    el[event] = undefined;

    const method = this.getMethod(element, event);
    let lastValue: unknown = undefined;
    let isDestroyed = false;

    // Use queueMicrotask to defer initial check until after current task
    queueMicrotask(() => {
      if (isDestroyed) return;

      // Poll for value changes using requestAnimationFrame
      const checkValue = () => {
        if (isDestroyed) return;

        const currentValue = el[event];
        // Check if it's a signal (callable function)
        const value = typeof currentValue === 'function' ? currentValue() : currentValue;

        if (value !== lastValue) {
          lastValue = value;
          if (value !== undefined) {
            method(value);
          }
        }

        requestAnimationFrame(checkValue);
      };

      checkValue();
    });

    return () => {
      isDestroyed = true;
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