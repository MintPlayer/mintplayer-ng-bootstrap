import { InjectionToken } from '@angular/core';

/** The dom id assigned to the rendered tooltip element so the trigger can point at it via aria-describedby. */
export const TOOLTIP_ID = new InjectionToken<string>('TOOLTIP_ID');
