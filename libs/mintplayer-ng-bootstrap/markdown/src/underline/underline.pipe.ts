import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsUnderline',
  pure: true,
})
export class BsUnderlinePipe implements PipeTransform {
  private domSanitizer = inject(DomSanitizer);

  transform(value: string | SafeHtml | null, classList: string[] = []): SafeHtml | null {
    const txt = `\\<ins\\>\\b(?<underlinedtext>.+?)\\b\\<\\/ins\\>`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const classString = classList.length === 0 ? '' : ` class="${classList.join(' ')}"`;
    const result = safeValue.replace(rgx, `<u${classString}>$<underlinedtext></u>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
