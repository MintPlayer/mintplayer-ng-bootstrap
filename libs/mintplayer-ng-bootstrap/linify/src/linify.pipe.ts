import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsLinify',
})
export class BsLinifyPipe implements PipeTransform {
  /**
   * Splits text into lines, normalizing CRLF first.
   *
   * The `/g` flag is load-bearing: without it only the FIRST CRLF was rewritten
   * and every later line of Windows-authored text kept a trailing `\r`, which
   * then rode along into whatever the consumer rendered or compared.
   */
  transform(value: string, removeEmptyEntries = true) {
    const split = value
      .replace(/\r\n/g, '\n')
      .split('\n');

    return removeEmptyEntries
      ? split.filter((line) => line !== '')
      : split;
  }
}
