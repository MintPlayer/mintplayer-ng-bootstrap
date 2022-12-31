import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'bsStrikethrough'
})
export class BsStrikethroughPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: unknown, ...args: unknown[]): unknown {
    throw 'Not implemented';
  }

}
