import { InjectionToken } from '@angular/core';

/** The dom id assigned to the rendered popover dialog so the trigger can point at it via aria-controls. */
export const POPOVER_ID = new InjectionToken<string>('POPOVER_ID');
