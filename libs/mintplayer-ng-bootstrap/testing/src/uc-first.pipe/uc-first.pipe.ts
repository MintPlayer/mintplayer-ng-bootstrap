import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ucFirst'
})
export class UcFirstMockPipe implements PipeTransform {

  transform(value: string, ...args: any[]) {
    return value[0].toUpperCase() + value.slice(1);
  }

}
