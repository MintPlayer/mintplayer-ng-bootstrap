import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import { AbstractType } from '../types/abstract.type';

@Pipe({
  name: 'bsInstanceof',
  pure: true,
  standalone: true,
})
export class BsInstanceofPipe implements PipeTransform {
  public transform<V, R>(value: V, type: AbstractType<R>): R | undefined {
    return value instanceof type ? value : undefined;
  }
}