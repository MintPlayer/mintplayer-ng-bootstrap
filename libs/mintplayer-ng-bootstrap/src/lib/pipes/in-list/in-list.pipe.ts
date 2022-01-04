import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inList'
})
export class BsInListPipe implements PipeTransform {

  transform(items: any[], parameter: number) {
    return items.some(item => item.id === parameter);
  }

}
