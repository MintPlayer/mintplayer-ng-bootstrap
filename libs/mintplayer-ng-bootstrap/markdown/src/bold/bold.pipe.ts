import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsBold'
})
export class BsBoldPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: string, numberOfStars: number = 2): SafeHtml | null {
    const txt = `\\b\*{${numberOfStars}}\b(?<boldtext>[^\\*]+)\\b\*{${numberOfStars}}\b`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const result = safeValue.replace(rgx, `<b class="text-danger">$<boldtext></b>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
