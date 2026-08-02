import { BsSelectValueAccessor } from './select-value-accessor';

/**
 * A placeholder option — `<option value="">` — is the idiomatic way to offer
 * "none / auto / follow the browser", and `mp-select` normalizes an empty
 * selection to `null` on its host. The host is what the accessor reads, because
 * `mp-select` re-dispatches a composed `change` whose target is the element
 * rather than the inner `<select>`.
 *
 * Selecting such an option therefore handed `null` to `extractId`, which called
 * `.split(':')` on it and threw. The model never updated, so the control looked
 * stuck on whatever was chosen before — reported as "switching to the browser
 * locale changes nothing", with a console TypeError behind it.
 *
 * These exercise the id/value mapping directly; the accessor's Angular wiring is
 * covered by the component spec next door.
 */
describe('BsSelectValueAccessor — placeholder options', () => {
  function accessor(): BsSelectValueAccessor {
    // The mapping methods under test touch neither DI nor the host component.
    return Object.create(BsSelectValueAccessor.prototype, {
      optionMap: { value: new Map<string, unknown>(), writable: true },
    }) as BsSelectValueAccessor;
  }

  it('returns null for extractId rather than throwing', () => {
    const a = accessor();

    expect(() => a.extractId(null)).not.toThrow();
    expect(a.extractId(null)).toBeNull();
    expect(a.extractId(undefined)).toBeNull();
  });

  it('passes a placeholder selection through to the model as null', () => {
    const a = accessor();

    // What mp-select reports when the empty-valued option is chosen.
    expect(a.getOptionValue(null)).toBeNull();
  });

  it('still resolves a registered [ngValue] option by its id', () => {
    const a = accessor();
    a.optionMap.set('1', 1800);

    expect(a.getOptionValue('1: 1800')).toBe(1800);
  });

  it('falls through to the raw string for a plain value attribute', () => {
    const a = accessor();

    // Options written as `value="nl-BE"` are never registered in optionMap —
    // only [ngValue] registers — so the string itself is the value.
    expect(a.getOptionValue('nl-BE')).toBe('nl-BE');
  });

  it('does not mistake an unregistered id for a registered one', () => {
    const a = accessor();
    a.optionMap.set('0', 'zero');

    expect(a.getOptionValue('7: seven')).toBe('7: seven');
  });
});
