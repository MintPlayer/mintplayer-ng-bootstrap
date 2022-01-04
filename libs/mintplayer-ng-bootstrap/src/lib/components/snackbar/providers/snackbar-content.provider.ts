import { InjectionToken, TemplateRef } from "@angular/core";

export const SNACKBAR_CONTENT = new InjectionToken<TemplateRef<any>>('SnackbarContent');