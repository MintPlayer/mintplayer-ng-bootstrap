import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsLinify',
  
})
export class BsLinifyPipe implements PipeTransform {
  transform(value: string, removeEmptyEntries = true) {
    const split = value
      .replace('\r\n', '\n')
      .split('\n');

    return removeEmptyEntries
      ? split.filter((line) => line !== '')
      : split;
  }
}
