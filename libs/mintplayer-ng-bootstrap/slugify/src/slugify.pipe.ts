import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsSlugify',
  pure: true,
})
export class BsSlugifyPipe implements PipeTransform {
  /**
   * Turns a title into a URL slug.
   *
   * Latin text is still decomposed and stripped of diacritics, so `Crème` stays
   * `creme` and existing slugs are unchanged. What changed is the character
   * class: it keeps letters and numbers in ANY script (`\p{L}\p{N}`) instead of
   * ASCII `\w`. The old class removed every character of a script with no Latin
   * decomposition, so a non-Latin title slugified to the empty string — a route
   * segment that cannot work rather than one that merely looks unfamiliar.
   */
  transform(value: string) {
    return value.toString().toLowerCase()
      .replace(/\s+/g, '-')                             // Replace spaces with -
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^\p{L}\p{N}_-]+/gu, '')                // Remove all non-word chars
      .replace(/-{2,}/g, '-')                           // Replace multiple - with single -
      .replace(/^-+/, '')                               // Trim - from start of text
      .replace(/-+$/, '');                              // Trim - from end of text
  }
}
