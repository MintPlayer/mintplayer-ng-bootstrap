import { deepClone } from './parentify.service';

describe('deepClone', () => {
  it('should work', () => {
    expect(deepClone({}, false, [Object], false)).toEqual({ $original: {} });
  });
});
