import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'bsUnderline'
})
export class BsUnderlinePipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: unknown): unknown {
    throw 'Not implemented';
  }

}
