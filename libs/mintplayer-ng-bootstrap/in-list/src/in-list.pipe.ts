import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsInList'
})
export class BsInListPipe implements PipeTransform {

  transform(items: any[], parameter: number) {
    return items.some(item => item.id === parameter);
  }

}
