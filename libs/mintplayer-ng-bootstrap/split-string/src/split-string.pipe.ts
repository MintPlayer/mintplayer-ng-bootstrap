import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsSplitString',
  pure: true,
  standalone: true
})
export class BsSplitStringPipe implements PipeTransform {
  transform(value: string, seperator = '\n', removeEmptyEntries = true): string[] {
    return value.split(seperator)
      .filter(line => !removeEmptyEntries || (line !== ''));
  }
}
