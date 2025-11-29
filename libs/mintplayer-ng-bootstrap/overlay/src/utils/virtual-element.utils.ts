import { ElementRef } from '@angular/core';

export function createVirtualElement(x: number, y: number): ElementRef {
  const virtualElement = {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: y,
      left: x,
      bottom: y,
      right: x,
      x: x,
      y: y,
      toJSON: () => ({})
    })
  };
  return new ElementRef(virtualElement);
}
