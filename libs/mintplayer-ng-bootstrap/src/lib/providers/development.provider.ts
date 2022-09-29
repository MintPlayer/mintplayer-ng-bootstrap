import { InjectionToken } from "@angular/core";

/**
 * Register this provider with a **true** value to enable Development mode for ng-bootstrap.
 * This will make the overlays, which usually close when clicking outside of them,
 * to stay open.
 **/
export const BS_DEVELOPMENT = new InjectionToken<boolean>('BootstrapDevelopment');