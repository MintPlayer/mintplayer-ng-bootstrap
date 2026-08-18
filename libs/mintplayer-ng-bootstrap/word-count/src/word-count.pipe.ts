import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsWordCount',
  pure: true,
})
export class BsWordCountPipe implements PipeTransform {
  /**
   * Counts words, where a word is any run of non-whitespace.
   *
   * Splits on `/\s+/` rather than collapsing whitespace and splitting on a
   * literal space: the earlier version collapsed only runs of TWO or more
   * whitespace characters, so a single newline or tab between two words was
   * neither collapsed nor split on and the pair counted as one word — while two
   * or more whitespace characters happened to work, which is what made it hard
   * to notice.
   */
  transform(value: string) {
    if (!value) return 0;
    return value
      .split(/\s+/)
      .filter((word) => word !== '')
      .length;
  }
}
