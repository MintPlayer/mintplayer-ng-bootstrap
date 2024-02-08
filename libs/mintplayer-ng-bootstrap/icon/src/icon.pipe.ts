import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
  name: 'bsIcon',
  standalone: true,
  pure: true
})
export class BsIconPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: () => Promise<typeof import("*.svg")>) {
    console.warn('transform');
    if (value) {
      return value().then((ic) => {
        return this.sanitizer.bypassSecurityTrustHtml(ic.default);
      });
    } else {
      return Promise.resolve('');
    }
  }
}
