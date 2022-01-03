import { InjectionToken, TemplateRef } from "@angular/core";

export const TOOLTIP_CONTENT = new InjectionToken<TemplateRef<any>>('TooltipContent');