import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsItalic'
})
export class BsItalicPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: string, numberOfStars: number = 1): SafeHtml | null {
    const txt = `\\b\*{${numberOfStars}}\b(?<italictext>[^\\*]+)\\b\*{${numberOfStars}}\b`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const result = safeValue.replace(rgx, `<b class="text-danger">$<italictext></b>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
