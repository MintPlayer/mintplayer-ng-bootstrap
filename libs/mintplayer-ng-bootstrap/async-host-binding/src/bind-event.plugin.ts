// import { EventManager } from '@angular/platform-browser';
// import { EMPTY } from 'rxjs';
// import { switchMap, take } from 'rxjs/operators';

// export class BsBindEventPlugin {
//   manager!: EventManager;

//   supports(event: string) {
//     return event.startsWith('$.');
//   }

//   addEventListener(element: HTMLElement, event: string) {
//     const el = <any>element;
//     el[event] = EMPTY;

//     const method = this.getMethod(element, event);
//     const sub = this.manager.getZone()
//       .onStable.pipe(take(1), switchMap(() => el[event]))
//       .subscribe((value) => method(value));

//     return () => sub.unsubscribe();
//   }

//   private getMethod(element: HTMLElement, event: string) {
//     const el = <any>element;
//     const [, key, value, unit = ''] = event.split('.');

//     if (event.endsWith('.attr')) {
//       return (v: unknown) => element.setAttribute(key, String(v));
//     }

//     if (key === 'class') {
//       return (v: unknown) => element.classList.toggle(value, !!v);
//     }

//     if (key === 'style') {
//       return (v: unknown) => element.style.setProperty(value, `${v}${unit}`);
//     }

//     return (v: unknown) => (el[key] = v);
//   }
// }