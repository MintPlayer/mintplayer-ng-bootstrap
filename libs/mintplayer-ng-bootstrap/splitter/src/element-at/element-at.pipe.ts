import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsElementAt',
  standalone: false,
})
export class BsElementAtPipe implements PipeTransform {

  transform(value: any[] | null | undefined, index: number) {
    if (value) {
      return value[index];
    } else {
      return null;
    }
  }

}
