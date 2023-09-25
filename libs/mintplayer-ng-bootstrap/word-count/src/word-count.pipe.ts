import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsWordCount',
  pure: true
})
export class BsWordCountPipe implements PipeTransform {
  transform(value: string) {
    if ((value === null) || (value === '')) {
      return 0;
    } else {
      return value
        .replace(/(^\s+)|(\s+$)/gi, '')
        .replace(/\s{2,}/gi, ' ')
        .split(' ')
        .filter(w => w !== '')
        .length;
    }
  }
}
