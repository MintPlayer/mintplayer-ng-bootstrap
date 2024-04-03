import { Provider } from '@angular/core';
import { EVENT_MANAGER_PLUGINS } from '@angular/platform-browser';
import { BsBindEventPlugin } from './bind-event.plugin';

export function provideAsyncHostBindings(): Provider[] {
  return [{
    provide: EVENT_MANAGER_PLUGINS,
    useClass: BsBindEventPlugin,
    multi: true,
  }];
}