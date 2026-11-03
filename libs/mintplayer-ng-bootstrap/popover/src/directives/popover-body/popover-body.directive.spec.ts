import { TestBed } from '@angular/core/testing';
import { BsPopoverBodyDirective } from './popover-body.directive';

describe('BsPopoverBodyDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsPopoverBodyDirective());
    expect(directive).toBeTruthy();
  });
});
