import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bsStrikethrough',
  standalone: true,
  pure: true,
})
export class BsStrikethroughPipe implements PipeTransform {

  domSanitizer = inject(DomSanitizer);

  transform(value: string | SafeHtml | null, numberOfTildes: number = 2, classList: string[] = []): SafeHtml | null {
    const txt = `\\~{${numberOfTildes}}\\b(?<strikethroughtext>[^\\~]+)\\b\\~{${numberOfTildes}}`;
    const rgx = new RegExp(txt, "gm");
    const safeValue = this.domSanitizer.sanitize(SecurityContext.HTML, value);

    if (!safeValue) {
      return null;
    }

    const classString = classList.length === 0 ? '' : ` class="${classList.join(' ')}"`;
    const result = safeValue.replace(rgx, `<strike${classString}>$<strikethroughtext></strike>`);
    const safeResult = this.domSanitizer.bypassSecurityTrustHtml(result);
    return safeResult;
  }

}
