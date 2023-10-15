import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsHasProperty',
})
export class HasPropertyPipe implements PipeTransform {
  transform(value: Object, propName: string) {
    return propName in value;
  }
}
