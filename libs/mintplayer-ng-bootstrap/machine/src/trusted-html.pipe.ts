import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Marks core-produced markup as trusted for `[innerHTML]`: the compiled form of
 * a view's `v-html`. The view contract is that `v-html` only ever carries markup
 * the core produced (flag and file-type SVGs, highlighted code rows), which the
 * React, Vue and Lit fronts insert as-is. Angular's sanitiser would instead drop
 * every `<svg>` — an empty flag, an icon-less file manager — so the Angular front
 * trusts it the same way.
 *
 *     <span [innerHTML]="view.flagHtml | mpTrustedHtml"></span>
 */
@Pipe({ name: 'mpTrustedHtml' })
export class MpTrustedHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(html: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }
}
