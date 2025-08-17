import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'bsTrustHtml',
  standalone: true,
  pure: true,
})
export class BsTrustHtmlPipe implements PipeTransform {
  sanitizer = inject(DomSanitizer);

  transform(value: string) {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
