import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsAddProperties'
})
export class BsAddPropertiesMockPipe implements PipeTransform {

  transform(value: Object | null, toAdd: Object) {
    return value;
  }

}
