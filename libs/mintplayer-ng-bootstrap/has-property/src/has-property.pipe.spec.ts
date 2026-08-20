import { BsHasPropertyPipe } from './has-property.pipe';

describe('BsHasPropertyPipe', () => {
  const pipe = new BsHasPropertyPipe();

  it('finds an own property', () => {
    expect(pipe.transform({ id: 1 }, 'id')).toBe(true);
  });

  it('reports a missing property', () => {
    expect(pipe.transform({ id: 1 }, 'name')).toBe(false);
  });

  it('finds a property whose value is undefined', () => {
    expect(pipe.transform({ id: undefined }, 'id')).toBe(true);
  });

  it('finds a property whose value is null', () => {
    expect(pipe.transform({ id: null }, 'id')).toBe(true);
  });

  it('finds a property whose value is falsy', () => {
    expect(pipe.transform({ count: 0 }, 'count')).toBe(true);
  });

  it('finds an index on an array', () => {
    expect(pipe.transform(['a', 'b'], '1')).toBe(true);
  });

  it('reports an out-of-range index as missing', () => {
    expect(pipe.transform(['a'], '5')).toBe(false);
  });

  // `in` walks the prototype chain, so an inherited member reads as present.
  // Consumers using this to distinguish "the API returned this field" from "it
  // did not" need to know that.
  it('finds an inherited property', () => {
    expect(pipe.transform({}, 'toString')).toBe(true);
  });

  it('finds a property declared on a class prototype', () => {
    class Model {
      get label() {
        return 'x';
      }
    }
    expect(pipe.transform(new Model(), 'label')).toBe(true);
  });

  it('reports every property as missing on an object with no prototype', () => {
    expect(pipe.transform(Object.create(null), 'toString')).toBe(false);
  });
});
