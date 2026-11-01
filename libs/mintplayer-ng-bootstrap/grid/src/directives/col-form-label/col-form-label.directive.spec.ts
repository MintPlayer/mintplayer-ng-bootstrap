import { TestBed } from '@angular/core/testing';
import { BsColFormLabelDirective } from './col-form-label.directive';

describe('BsColFormLabelDirective', () => {
  it('installs the Bootstrap forms part for the page (#452)', () => {
    const directive = TestBed.runInInjectionContext(() => new BsColFormLabelDirective());
    expect(directive).toBeTruthy();
    expect(document.head.querySelector('style[data-mp-light-styles="bootstrap-forms"]')).not.toBeNull();
  });
});
