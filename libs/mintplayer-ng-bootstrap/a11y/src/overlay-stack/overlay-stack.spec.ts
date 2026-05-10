import { TestBed } from '@angular/core/testing';
import { BsOverlayStackService } from './overlay-stack.service';

describe('BsOverlayStackService', () => {
  let stack: BsOverlayStackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    stack = TestBed.inject(BsOverlayStackService);
  });

  it('starts empty', () => {
    expect(stack.peek()).toBeNull();
  });

  it('push returns a unique token and isTop is true for the latest push', () => {
    const a = stack.push();
    expect(stack.isTop(a)).toBe(true);

    const b = stack.push();
    expect(stack.isTop(b)).toBe(true);
    expect(stack.isTop(a)).toBe(false);

    expect(a).not.toBe(b);
  });

  it('release of the top frame restores the previous frame as top', () => {
    const a = stack.push();
    const b = stack.push();
    stack.release(b);
    expect(stack.isTop(a)).toBe(true);
    expect(stack.peek()).toBe(a);
  });

  it('release of a non-top frame leaves the top intact', () => {
    const a = stack.push();
    const b = stack.push();
    const c = stack.push();
    stack.release(b);
    expect(stack.isTop(c)).toBe(true);
    expect(stack.isTop(a)).toBe(false);

    stack.release(c);
    expect(stack.isTop(a)).toBe(true);
  });

  it('release of an unknown token is a no-op', () => {
    const a = stack.push();
    stack.release(Symbol('not-in-stack'));
    expect(stack.isTop(a)).toBe(true);
    expect(stack.peek()).toBe(a);
  });

  it('peek returns null after every frame is released', () => {
    const a = stack.push();
    const b = stack.push();
    stack.release(a);
    stack.release(b);
    expect(stack.peek()).toBeNull();
  });

  it('handles deep nesting (5+ frames) in LIFO order', () => {
    const tokens = [stack.push(), stack.push(), stack.push(), stack.push(), stack.push()];
    for (let i = tokens.length - 1; i >= 0; i--) {
      expect(stack.isTop(tokens[i])).toBe(true);
      stack.release(tokens[i]);
    }
    expect(stack.peek()).toBeNull();
  });
});
