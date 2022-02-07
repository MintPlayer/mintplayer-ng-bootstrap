import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jaggedLength'
})
export class JaggedLengthPipe implements PipeTransform {

  transform(value: any[][]) {
    return value.map(arr => arr.length).reduce((sum, current) => sum + current, 0);  
  }

}
