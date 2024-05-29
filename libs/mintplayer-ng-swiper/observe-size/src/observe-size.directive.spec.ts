// global.ResizeObserver = require('resize-observer-polyfill');
import { BsObserveSizeDirective } from './observe-size.directive';

describe('ObserveSizeDirective', () => {
  beforeEach(() => {
    // We mocked "ResizeObserver" here 💥.
    global.ResizeObserver = class MockedResizeObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
  });

  it('should create an instance', () => {
    const directive = new BsObserveSizeDirective(null!, null, null!);
    expect(directive).toBeTruthy();
  });
});