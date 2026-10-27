import { displayVersion } from './bootstrap-version.provider';

describe('displayVersion', () => {
  it('shows a stamped version unchanged', () => {
    expect(displayVersion('22.28.0')).toBe('22.28.0');
    expect(displayVersion('23.0.0-next.1')).toBe('23.0.0-next.1');
  });

  it('shows dev for the unstamped placeholder', () => {
    expect(displayVersion('0.0.0-PLACEHOLDER')).toBe('dev');
  });
});
