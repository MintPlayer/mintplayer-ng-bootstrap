import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsAddProperties',
})
export class BsAddPropertiesPipe implements PipeTransform {
  transform(value: Object | null, toAdd: Object) {
    return Object.assign({}, value ?? {}, toAdd);
  }
}
