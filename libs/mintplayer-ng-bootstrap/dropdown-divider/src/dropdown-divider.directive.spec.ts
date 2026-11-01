import { TestBed } from '@angular/core/testing';
import { BsDropdownDividerDirective } from './dropdown-divider.directive';

describe('BsDropdownDividerDirective', () => {
  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new BsDropdownDividerDirective());
    expect(directive).toBeTruthy();
  });
});
