import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsAddProperties',
  standalone: false,
})
export class BsAddPropertiesPipe implements PipeTransform {
  transform(value: Object | null, toAdd: Object) {
    const result = Object.assign(value ?? {}, toAdd);
    return result;
  }
}
