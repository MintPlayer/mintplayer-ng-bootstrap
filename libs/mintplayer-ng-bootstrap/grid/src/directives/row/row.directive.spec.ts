import { TestBed } from '@angular/core/testing';
import { BsGridRowDirective } from './row.directive';

describe('BsGridRowDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsGridRowDirective());
    expect(directive).toBeTruthy();
  });
});
