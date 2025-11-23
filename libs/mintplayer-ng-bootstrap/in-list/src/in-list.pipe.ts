import { Pipe, PipeTransform } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Pipe({
  name: 'bsInList',
  
})
export class BsInListPipe<T> implements PipeTransform {
  transform(items: HasId<T>[], parameter: T) {
    return items.some(item => item.id === parameter);
  }
}
