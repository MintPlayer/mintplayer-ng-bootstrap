import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsUcFirst',
  standalone: true,
  pure: true,
})
export class BsUcFirstPipe implements PipeTransform {
  transform(value: string, ...args: any[]) {
    return value[0].toUpperCase() + value.slice(1);
  }
}
