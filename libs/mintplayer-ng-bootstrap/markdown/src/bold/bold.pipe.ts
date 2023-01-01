import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsBold'
})
export class BsBoldPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: string, numberOfStars: number = 2, classList: string[] = []): SafeHtml | null {
    const txt = `\\*{${numberOfStars}}\\b(?<boldtext>[^\\*]+)\\b\\*{${numberOfStars}}`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const classString = classList.length === 0 ? '' : ` class="${classList.join(' ')}"`;
    const result = safeValue.replace(rgx, `<b${classString}>$<boldtext></b>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
