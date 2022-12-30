import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'ordinalNumber'
})
export class BsOrdinalNumberPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: string, ...args: string[]): SafeHtml {
    const sanitizeRgx = new RegExp(`[^A-Za-z]`, 'gm');
    const countWords = args.map(w => w.replace(sanitizeRgx, '')).join('|');
    const rgx = new RegExp(`\\b(?<num>[0-9]+)(?<tel>${countWords})\\b`, 'gm');
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);
    if (!safeValue) return '';

    const result = safeValue.replace(rgx, "$<num><sup>$<tel></sup>");
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
