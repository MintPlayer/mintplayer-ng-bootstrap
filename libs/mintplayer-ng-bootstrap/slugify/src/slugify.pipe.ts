import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsSlugify',
  standalone: true,
  pure: true,
})
export class BsSlugifyPipe implements PipeTransform {
  transform(value: string) {
    return value.toString().toLowerCase()
      .replace(/\s+/g, '-')                             // Replace spaces with -
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^\w\-]+/g, '')                         // Remove all non-word chars
      .replace(/\-\-+/g, '-')                           // Replace multiple - with single -
      .replace(/^-+/, '')                               // Trim - from start of text
      .replace(/-+$/, '');                              // Trim - from end of text
  }
}
