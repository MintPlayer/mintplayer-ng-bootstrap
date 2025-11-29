// global.ResizeObserver = require('resize-observer-polyfill');
import { vi } from 'vitest';
import { BsObserveSizeDirective } from './observe-size.directive';

describe('ObserveSizeDirective', () => {
  beforeEach(() => {
    // We mocked "ResizeObserver" here 💥.
    global.ResizeObserver = class MockedResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('should create an instance', () => {
    const directive = new BsObserveSizeDirective(null!, null, null!);
    expect(directive).toBeTruthy();
  });
});