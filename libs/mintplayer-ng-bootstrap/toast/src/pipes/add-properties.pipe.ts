import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsAddProperties'
})
export class BsAddPropertiesPipe implements PipeTransform {

  transform(value: Object | null, toAdd: Object) {
    const result = Object.assign(value ?? {}, toAdd);
    return result;
  }

}
