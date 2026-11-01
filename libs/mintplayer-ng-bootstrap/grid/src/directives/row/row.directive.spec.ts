import { TestBed } from '@angular/core/testing';
import { BsGridRowDirective } from './row.directive';

describe('BsGridRowDirective', () => {
  it('installs the Bootstrap grid part for the page (#452)', () => {
    const directive = TestBed.runInInjectionContext(() => new BsGridRowDirective());
    expect(directive).toBeTruthy();
    expect(document.head.querySelector('style[data-mp-light-styles="bootstrap-grid"]')).not.toBeNull();
  });
});
