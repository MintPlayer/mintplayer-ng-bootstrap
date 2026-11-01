import { TestBed } from '@angular/core/testing';
import { BsPopoverHeaderDirective } from './popover-header.directive';

describe('BsPopoverHeaderDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsPopoverHeaderDirective());
    expect(directive).toBeTruthy();
  });
});
