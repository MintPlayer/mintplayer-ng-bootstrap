import { columnClasses, containerClass } from './grid.core';

describe('containerClass', () => {
  it('is .container up to sm, a breakpoint container above, fluid for never', () => {
    expect(containerClass('xs')).toBe('container');
    expect(containerClass('sm')).toBe('container');
    expect(containerClass('lg')).toBe('container-lg');
    expect(containerClass('never')).toBe('container-fluid');
  });
});

describe('columnClasses', () => {
  it('maps spans per breakpoint, xxs to the unprefixed col-N', () => {
    expect(columnClasses({ xxs: 12, md: 6, xl: 4 })).toBe('col-12 col-md-6 col-xl-4');
  });

  it('adds nothing for unset, zero or NaN spans', () => {
    expect(columnClasses({})).toBeNull();
    expect(columnClasses({ md: 0, lg: Number.NaN })).toBeNull();
  });
});
