import { BsLazyLoadDirective } from './lazy-load.directive';

describe('LazyLoadDirective', () => {
  it('should create an instance', () => {
    const directive = new BsLazyLoadDirective(null!);
    expect(directive).toBeTruthy();
  });
});
