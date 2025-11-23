import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsHasProperty',
  
})
export class BsHasPropertyPipe implements PipeTransform {
  transform(value: Object, propName: string) {
    return propName in value;
  }
}
