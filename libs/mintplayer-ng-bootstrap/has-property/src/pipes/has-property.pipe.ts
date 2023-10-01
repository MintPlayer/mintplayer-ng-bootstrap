import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import { AbstractType } from '../types/abstract.type';
import { BsHasPropertyContext } from '../interfaces/has-property-context';

@Pipe({
  name: 'bsHasProperty',
  pure: true,
})
export class BsHasPropertyPipe implements PipeTransform {
  // public transform<V, R>(value: V, type: AbstractType<R>): R | undefined {
  //   return value instanceof type ? value : undefined;
  // }
  public transform<V, R>(value: any, propertyName: string): value is BsHasPropertyContext<Exclude<TemplateStringsArray, false | 0 | '' | null | undefined>> {
    return (propertyName in value);
  }
}