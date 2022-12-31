import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'bsMarkdown'
})
export class BsMarkdownPipe implements PipeTransform {

  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: unknown, ...args: unknown[]): unknown {
    throw 'Not implemented';
  }

}
