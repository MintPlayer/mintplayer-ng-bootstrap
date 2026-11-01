import { TestBed } from '@angular/core/testing';
import { BsColFormLabelDirective } from './col-form-label.directive';

describe('BsColFormLabelDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsColFormLabelDirective());
    expect(directive).toBeTruthy();
  });
});
