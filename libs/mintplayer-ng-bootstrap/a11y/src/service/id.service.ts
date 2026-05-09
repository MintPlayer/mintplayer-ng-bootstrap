import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BsIdService {
  private counter = 0;

  next(prefix: string): string {
    return `${prefix}-${++this.counter}`;
  }
}
