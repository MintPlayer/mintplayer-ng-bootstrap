import { describe, expect, it } from 'vitest';
import { colFormLabelCore, connectForm, formControlCore } from './form.core';

describe('form', () => {
  it('renders a plain form: no role, the method lowercased, the action beside the bag', () => {
    const view = connectForm({ method: 'POST' }, '/save');
    expect(view.form).toEqual({ method: 'post' });
    expect(view.action).toBe('/save');
    expect(view.root).toEqual({ class: 'form-host' });
  });

  it('writes no method or action when unset', () => {
    const view = connectForm({ method: null }, null);
    expect(view.form['method']).toBeNull();
    expect(view.action).toBeUndefined();
  });

  it('the directives put the Bootstrap classes on the consumer element', () => {
    expect(formControlCore.view({ inputs: {}, state: {} } as never)).toEqual({ class: 'form-control' });
    expect(colFormLabelCore.view({ inputs: {}, state: {} } as never)).toEqual({ class: 'col-form-label' });
  });
});
