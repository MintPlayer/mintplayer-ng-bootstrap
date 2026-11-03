// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { associateFloatingLabel } from './floating-label.core';

function host(markup: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = markup;
  return div;
}

describe('floating label', () => {
  it('points an unassociated label at its control', () => {
    const el = host('<input class="form-control" placeholder="x"><label>Email</label>');
    associateFloatingLabel(el);
    const input = el.querySelector('input')!;
    expect(input.id).not.toBe('');
    expect(el.querySelector('label')!.htmlFor).toBe(input.id);
  });

  it("keeps the control's own id", () => {
    const el = host('<select id="mine"></select><label>Pick</label>');
    associateFloatingLabel(el);
    expect(el.querySelector('label')!.htmlFor).toBe('mine');
  });

  it("leaves a consumer's for alone", () => {
    const el = host('<textarea></textarea><label for="elsewhere">Notes</label>');
    associateFloatingLabel(el);
    expect(el.querySelector('label')!.htmlFor).toBe('elsewhere');
    expect(el.querySelector('textarea')!.id).toBe('');
  });
});
