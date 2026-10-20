import { describe, expect, it } from 'vitest';
import { errorFeedback } from './error-feedback';
import { preHydrationValue } from './pre-hydration';

describe('errorFeedback', () => {
  it('wires both references and aria-invalid together while invalid', () => {
    const feedback = errorFeedback('x-error', ' Required ');
    expect(feedback.control).toEqual({ 'aria-invalid': 'true', 'aria-errormessage': 'x-error', 'aria-describedby': 'x-error' });
    expect(feedback.message).toEqual({ attrs: { id: 'x-error', class: 'invalid-feedback d-block' }, text: 'Required' });
  });

  it('emits nothing for a valid control or a blank message', () => {
    expect(errorFeedback('x', 'Required', false).message).toBeNull();
    expect(errorFeedback('x', '   ').control['aria-errormessage']).toBeNull();
    expect(errorFeedback('x', null).control['aria-invalid']).toBeNull();
  });
});

describe('preHydrationValue', () => {
  it('returns text typed into the server DOM', () => {
    const root = document.createElement('div');
    root.innerHTML = '<input>';
    (root.querySelector('input') as HTMLInputElement).value = 'ams';
    expect(preHydrationValue(root, '')).toBe('ams');
    expect(preHydrationValue(root, 'ams')).toBeNull();
  });

  it('returns null without a node', () => {
    expect(preHydrationValue(null, '')).toBeNull();
    expect(preHydrationValue(document.createElement('div'), '')).toBeNull();
  });
});
