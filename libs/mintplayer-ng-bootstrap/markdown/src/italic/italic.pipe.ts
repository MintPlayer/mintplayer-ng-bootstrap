import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsItalic',
  pure: true,
  standalone: true
})
export class BsItalicPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: string | SafeHtml | null, numberOfStars: number = 1, classList: string[] = []): SafeHtml | null {
    const txt = `\\*{${numberOfStars}}\\b(?<italictext>[^\\*]+)\\b\\*{${numberOfStars}}`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const classString = classList.length === 0 ? '' : ` class="${classList.join(' ')}"`;
    const result = safeValue.replace(rgx, `<i${classString}>$<italictext></i>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
