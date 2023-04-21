import { deepClone } from './parentify.service';

describe('deepClone', () => {
  it('should work', () => {
    const clone = deepClone({}, false, [Object], false);
    expect(clone.result).toEqual({ $original: {} });
  });
});
