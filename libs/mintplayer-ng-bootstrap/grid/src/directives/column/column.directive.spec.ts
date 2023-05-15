import { DestroyRef } from '@angular/core';
import { BsGridColumnDirective } from './column.directive';
import { TestBed } from '@angular/core/testing';

describe('BsGridColumnDirective', () => {
  it('should create an instance', () => {
    const destroy = TestBed.inject(DestroyRef);
    const directive = new BsGridColumnDirective(destroy);
    expect(directive).toBeTruthy();
  });
});
