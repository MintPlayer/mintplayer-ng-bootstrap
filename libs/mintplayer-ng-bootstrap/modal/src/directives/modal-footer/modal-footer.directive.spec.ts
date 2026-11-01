import { TestBed } from '@angular/core/testing';
import { BsModalFooterDirective } from './modal-footer.directive';

describe('BsModalFooterDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsModalFooterDirective());
    expect(directive).toBeTruthy();
  });
});
