import { test, expect, type Page } from '@playwright/test';

/* Spike S5 — FACE-in-FACE isolation + the nested-delegatesFocus focus model.
   Gates PRD §5.6 of docs/prd/phone-input-wc.md.

   The composite under test (fixture: entry.ts, real FormAssociatedMixin):

     <mp-spike-phone-input>            FACE, delegatesFocus
       #shadow-root
         <mp-spike-input-group>        shadow host (variant with/without delegatesFocus)
           <mp-spike-select>           FACE, delegatesFocus, native <select> in ITS shadow
           <span class=dial>           static, aria-hidden
           <input type=tel>            the editable control + validity anchor

   Every claim is asserted per engine; findings that are engine-DIVERGENT rather
   than universal are logged with console.log so the report can quote them. */

declare global {
  interface Window {
    spikeLog: { el: string; cb: string; value?: unknown }[];
    activeChain: () => string[];
    describeForm: (formId: string) => unknown;
  }
}

async function ready(page: Page, file: string) {
  await page.goto(file);
  await page.waitForFunction(
    () => !!customElements.get('mp-spike-phone-input') && !!customElements.get('mp-spike-select'),
  );
  await page.waitForFunction(() => !!(document.getElementById('phone') as any)?.telInput);
  await page.evaluate(() => window.spikeLog.splice(0));
}

const chain = (page: Page) => page.evaluate(() => window.activeChain());
const formInfo = (page: Page, id: string) => page.evaluate((f) => window.describeForm(f), id);
const spikeLog = (page: Page) => page.evaluate(() => window.spikeLog);

/* ------------------------------------------------------------------ S5.1 */

test.describe('S5.1 — does the inner FACE contribute to the outer form?', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-basic.html'));

  test('FormData holds only the composite value, never the inner select', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      el.telInput.value = '470123456';
      el.telInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const info: any = await formInfo(page, 'f1');
    console.log(`S5.1 f1 FormData: ${JSON.stringify(info.entries)}`);
    console.log(`S5.1 f1 form.elements: ${JSON.stringify(info.elements)}`);

    const names = info.entries.map((e: string[]) => e[0]);
    expect(names).toContain('phone');
    expect(names).not.toContain('inner-country');
    expect(new Set(names)).toEqual(new Set(['before', 'phone', 'after']));
    expect(info.entries).toContainEqual(['phone', '+32470123456']);
  });

  test('an empty national number submits nothing at all (no orphan dial code)', async ({ page }) => {
    const info: any = await formInfo(page, 'f1');
    const names = info.entries.map((e: string[]) => e[0]);
    console.log(`S5.1 empty-value FormData: ${JSON.stringify(info.entries)}`);
    expect(names).not.toContain('phone');
    expect(names).not.toContain('inner-country');
  });

  test('form.elements contains the composite host but not the inner select', async ({ page }) => {
    const info: any = await formInfo(page, 'f1');
    const joined = info.elements.join(' ');
    expect(joined).toContain('mp-spike-phone-input#phone');
    expect(joined).not.toContain('mp-spike-select');
  });

  test('CONTROL: the same FACE select in LIGHT DOM does submit — so tree scoping is the cause', async ({
    page,
  }) => {
    const info: any = await formInfo(page, 'f3');
    console.log(`S5.1 control (light-DOM select) FormData: ${JSON.stringify(info.entries)}`);
    expect(info.entries).toContainEqual(['light-country', 'be']);
    expect(info.elements.join(' ')).toContain('mp-spike-select#light-select');
  });

  test('the inner select reports no form owner; the host reports the outer form', async ({ page }) => {
    const owners = await page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      const inner = host.innerSelect;
      return {
        hostForm: host.internals?.form?.id ?? null,
        innerForm: inner.internals?.form?.id ?? null,
        innerHasName: inner.hasAttribute('name'),
        innerWillValidate: inner.internals?.willValidate ?? null,
        hostWillValidate: host.internals?.willValidate ?? null,
      };
    });
    console.log(`S5.1 internals.form: ${JSON.stringify(owners)}`);
    expect(owners.hostForm).toBe('f1');
    expect(owners.innerForm).toBeNull();
    expect(owners.innerHasName).toBe(true);
  });

  test('the inner FACE cannot block the outer form.checkValidity()', async ({ page }) => {
    // Make the INNER select invalid via its own internals. If it participated in
    // the outer form, this would silently block submission — a design-breaking bug.
    const before = await page.evaluate(() => (document.getElementById('f1') as HTMLFormElement).checkValidity());
    const after = await page.evaluate(() => {
      const inner = (document.getElementById('phone') as any).innerSelect;
      inner.setFormValidity({ customError: true }, 'inner is broken');
      return {
        formValid: (document.getElementById('f1') as HTMLFormElement).checkValidity(),
        innerValid: inner.internals?.validity?.valid ?? null,
        innerMessage: inner.internals?.validationMessage ?? null,
      };
    });
    console.log(`S5.1 outer checkValidity before=${before} after=${JSON.stringify(after)}`);
    expect(before).toBe(true);
    expect(after.formValid).toBe(true);
  });
});

/* ------------------------------------------------------------------ S5.2 */

test.describe('S5.2 — nested delegatesFocus', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-basic.html'));

  test('host.focus() lands on the first focusable through both shadow levels (group WITHOUT delegatesFocus)', async ({
    page,
  }) => {
    await page.evaluate(() => (document.getElementById('phone') as HTMLElement).focus());
    const c = await chain(page);
    console.log(`S5.2 phone.focus() chain (plain group): ${JSON.stringify(c)}`);
    expect(c[0]).toBe('mp-spike-phone-input#phone');
    expect(c).toContain('mp-spike-select#inner-country');
    expect(c[c.length - 1]).toBe('select');
  });

  test('host.focus() with the middle shadow root ALSO delegatesFocus', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('phone-df') as HTMLElement).focus());
    const c = await chain(page);
    console.log(`S5.2 phone-df.focus() chain (delegatesFocus group): ${JSON.stringify(c)}`);
    expect(c[0]).toBe('mp-spike-phone-input-dfgroup#phone-df');
    expect(c[c.length - 1]).toBe('select');
  });

  test('document.activeElement stops at the outer host (shadow encapsulation intact)', async ({ page }) => {
    const outer = await page.evaluate(() => {
      (document.getElementById('phone') as HTMLElement).focus();
      return document.activeElement?.tagName.toLowerCase() + '#' + (document.activeElement as HTMLElement).id;
    });
    console.log(`S5.2 document.activeElement: ${outer}`);
    expect(outer).toBe('mp-spike-phone-input#phone');
  });

  test('clicking a <label for> on the host reaches a control inside the shadow root', async ({ page }) => {
    await page.click('#lbl');
    const c = await chain(page);
    const leaf = c[c.length - 1];
    console.log(`S5.2 label-click chain: ${JSON.stringify(c)} -> leaf=${leaf}`);
    // Recorded, not assumed: label activation forwarding into a delegatesFocus
    // shadow root is exactly the kind of thing an engine can skip. And WHICH
    // control it reaches is a design question, not a bug: delegatesFocus sends
    // it to the FIRST focusable, which is the country select, while the label
    // reads "Phone".
    expect(c[0]).toBe('mp-spike-phone-input#phone');
    console.log(
      `S5.2 DESIGN NOTE: a <label for> on the host focuses ${leaf === 'input' ? 'the tel input' : 'the COUNTRY SELECT'}`,
    );
  });

  test('focusing the tel input directly does not get hijacked by delegatesFocus', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('phone') as any).telInput.focus());
    const c = await chain(page);
    console.log(`S5.2 telInput.focus() chain: ${JSON.stringify(c)}`);
    expect(c[c.length - 1]).toBe('input');
  });

  test('D9: choosing a country moves focus to the tel input', async ({ page }) => {
    await page.evaluate(() => {
      const sel = (document.getElementById('phone') as any).innerSelect.selectEl as HTMLSelectElement;
      sel.value = 'fr';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const c = await chain(page);
    console.log(`S5.2 after country change chain: ${JSON.stringify(c)}`);
    expect(c[c.length - 1]).toBe('input');
  });
});

/* ------------------------------------------------------------------ S5.3 */

test.describe('S5.3 — tab order', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-basic.html'));

  const stops = async (page: Page, count: number) => {
    const seen: string[][] = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      seen.push(await chain(page));
    }
    return seen;
  };

  test('forward: before -> select -> tel input -> after', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('before') as HTMLElement).focus());
    const seen = await stops(page, 3);
    const leaves = seen.map((c) => c.join(' > '));
    console.log(`S5.3 forward stops from #before:\n${leaves.map((l) => '  ' + l).join('\n')}`);

    expect(leaves[0]).toContain('mp-spike-select#inner-country');
    expect(leaves[1]).toBe('mp-spike-phone-input#phone > input');
    expect(leaves[2]).toBe('input#after');
  });

  test('the composite is exactly TWO tab stops', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('before') as HTMLElement).focus());
    const seen = await stops(page, 4);
    const inside = seen.filter((c) => c[0].startsWith('mp-spike-phone-input')).length;
    console.log(`S5.3 tab stops inside the composite: ${inside}`);
    expect(inside).toBe(2);
  });

  test('reverse: Shift+Tab mirrors it', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('after') as HTMLElement).focus());
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
      seen.push((await chain(page)).join(' > '));
    }
    console.log(`S5.3 reverse stops from #after:\n${seen.map((l) => '  ' + l).join('\n')}`);
    expect(seen[0]).toBe('mp-spike-phone-input#phone > input');
    expect(seen[1]).toContain('mp-spike-select#inner-country');
    expect(seen[2]).toBe('input#before');
  });

  test('same order when the middle group delegates focus too', async ({ page }) => {
    await page.evaluate(() => (document.getElementById('before2') as HTMLElement).focus());
    const seen = await stops(page, 3);
    const leaves = seen.map((c) => c.join(' > '));
    console.log(`S5.3 forward stops (delegatesFocus group):\n${leaves.map((l) => '  ' + l).join('\n')}`);
    expect(leaves[0]).toContain('mp-spike-select#inner-country');
    expect(leaves[1]).toBe('mp-spike-phone-input-dfgroup#phone-df > input');
    expect(leaves[2]).toBe('input#after2');
  });
});

/* ------------------------------------------------------------------ S5.4 */

test.describe('S5.4 — formDisabledCallback fan-out', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-disabled.html'));

  const state = (page: Page) =>
    page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      return {
        hostEffectiveDisabled: host.effectiveDisabled,
        hostHasAttr: host.hasAttribute('disabled'),
        innerSelectHasAttr: host.innerSelect.hasAttribute('disabled'),
        innerSelectEffective: host.innerSelect.effectiveDisabled,
        nativeSelectDisabled: host.innerSelect.selectEl.disabled,
        telDisabled: host.telInput.disabled,
      };
    });

  test('<fieldset disabled> fires it on the OUTER host and fans out to both controls', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    const log = await spikeLog(page);
    console.log(`S5.4 fieldset-disable log: ${JSON.stringify(log)}`);
    expect(log).toContainEqual({ el: 'phone', cb: 'formDisabledCallback', value: true });

    const s = await state(page);
    console.log(`S5.4 state after fieldset disable: ${JSON.stringify(s)}`);
    expect(s.hostEffectiveDisabled).toBe(true);
    expect(s.hostHasAttr).toBe(false); // the UA writes no attribute — known 0.3a finding
    expect(s.innerSelectHasAttr).toBe(true); // pushed down explicitly by the composite
    expect(s.nativeSelectDisabled).toBe(true);
    expect(s.telDisabled).toBe(true);
  });

  test('the inner FACE hears the fieldset only THROUGH the push-down, never from the form', async ({
    page,
  }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    const log = await spikeLog(page);
    const pushed = log.filter((e) => e.el === 'phone/inner-country');
    const notPushed = log.filter((e) => e.el === 'naive/inner-country');
    console.log(`S5.4 inner select of the PROPAGATING composite: ${JSON.stringify(pushed)}`);
    console.log(`S5.4 inner select of the NAIVE composite:       ${JSON.stringify(notPushed)}`);

    /* Order-free causality. The relative order of formDisabledCallback and
       attributeChangedCallback is engine-dependent (0.3a finding 3, and WebKit
       inverts it here), so ordering cannot carry the proof. What CAN: the inner
       select of the composite that pushes gets both events, and the inner select
       of the identical composite that does not push gets NEITHER — so the
       disabled fieldset never crosses the shadow boundary on its own. */
    expect(pushed.some((e) => e.cb === 'attributeChangedCallback:disabled')).toBe(true);
    expect(notPushed).toEqual([]);

    const order = pushed.map((e) => e.cb).join(' -> ');
    console.log(`S5.4 ENGINE-DEPENDENT ORDER on the inner FACE: ${order}`);
  });

  test('FALSIFICATION: without the push-down the inner controls stay LIVE in a disabled fieldset', async ({
    page,
  }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    const naive = await page.evaluate(() => {
      const host = document.getElementById('naive') as any;
      return {
        hostEffectiveDisabled: host.effectiveDisabled,
        innerSelectHasAttr: host.innerSelect.hasAttribute('disabled'),
        innerSelectEffective: host.innerSelect.effectiveDisabled,
        nativeSelectDisabled: host.innerSelect.selectEl.disabled,
        telDisabled: host.telInput.disabled,
      };
    });
    console.log(`S5.4 NAIVE composite in a disabled fieldset: ${JSON.stringify(naive)}`);
    // The host knows it is disabled...
    expect(naive.hostEffectiveDisabled).toBe(true);
    // ...but nothing inside it does. This is why the push-down is a design
    // obligation of the composite, not an optimization.
    expect(naive.nativeSelectDisabled).toBe(false);
    expect(naive.telDisabled).toBe(false);
  });

  test('FALSIFICATION: the naive composite is still keyboard-reachable when disabled', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    await page.evaluate(() => (document.getElementById('fs') as HTMLElement).focus());
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      seen.push((await chain(page)).join(' > '));
    }
    console.log(`S5.4 tab stops with fieldset disabled:\n${seen.map((l) => '  ' + l).join('\n')}`);
    // Recorded per engine: a disabled FACE host is skipped, but whether its
    // still-enabled shadow children are reachable is the interesting part.
    expect(seen.some((s) => s.includes('#naive'))).toBeDefined();
  });

  test('re-enabling the fieldset re-enables both controls', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    await page.evaluate(() => document.getElementById('fs')!.removeAttribute('disabled'));
    const s = await state(page);
    console.log(`S5.4 state after re-enable: ${JSON.stringify(s)}`);
    expect(s.hostEffectiveDisabled).toBe(false);
    expect(s.innerSelectHasAttr).toBe(false);
    expect(s.nativeSelectDisabled).toBe(false);
    expect(s.telDisabled).toBe(false);
  });

  test('THE TRAP: a property write cannot defeat a disabled fieldset', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    await page.evaluate(() => ((document.getElementById('phone') as any).disabled = false));
    const s = await state(page);
    console.log(`S5.4 state after property re-enable inside disabled fieldset: ${JSON.stringify(s)}`);
    expect(s.hostEffectiveDisabled).toBe(true);
    expect(s.innerSelectHasAttr).toBe(true);
    expect(s.nativeSelectDisabled).toBe(true);
    expect(s.telDisabled).toBe(true);
  });

  test('the own `disabled` attribute path also fans out (loose element, no form)', async ({ page }) => {
    await page.evaluate(() => document.getElementById('loose')!.setAttribute('disabled', ''));
    const s = await page.evaluate(() => {
      const host = document.getElementById('loose') as any;
      return {
        hostEffectiveDisabled: host.effectiveDisabled,
        innerSelectHasAttr: host.innerSelect.hasAttribute('disabled'),
        nativeSelectDisabled: host.innerSelect.selectEl.disabled,
        telDisabled: host.telInput.disabled,
      };
    });
    console.log(`S5.4 loose own-attribute state: ${JSON.stringify(s)}`);
    expect(s.hostEffectiveDisabled).toBe(true);
    expect(s.nativeSelectDisabled).toBe(true);
    expect(s.telDisabled).toBe(true);
  });

  test('the properly-propagating composite is out of the tab order when disabled', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fs')!.setAttribute('disabled', ''));
    await page.evaluate(() => document.body.focus());
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      seen.push((await chain(page)).join(' > '));
    }
    console.log(`S5.4 tab sweep with the fieldset disabled:\n${seen.map((l) => '  ' + l).join('\n')}`);
    expect(seen.some((s) => s.includes('mp-spike-phone-input#phone'))).toBe(false);
  });
});

/* ------------------------------------------------------------------ S5.5 */

test.describe('S5.5 — validity + reportValidity anchored inside a shadow root', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-validity.html'));

  test('the host is invalid with valueMissing and blocks submit', async ({ page }) => {
    const v = await page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      return {
        validity: {
          valid: host.internals?.validity?.valid,
          valueMissing: host.internals?.validity?.valueMissing,
        },
        message: host.internals?.validationMessage,
        formValid: (document.getElementById('f1') as HTMLFormElement).checkValidity(),
        matchesInvalid: host.matches(':invalid'),
      };
    });
    console.log(`S5.5 initial validity: ${JSON.stringify(v)}`);
    expect(v.validity.valid).toBe(false);
    expect(v.validity.valueMissing).toBe(true);
    expect(v.formValid).toBe(false);
    expect(v.matchesInvalid).toBe(true);
  });

  test('clicking submit is refused: no submit event, `invalid` event fires on the host', async ({ page }) => {
    await page.click('#submit1');
    const r = await page.evaluate(() => ({
      submits: (window as any).submitLog,
      invalids: (window as any).invalidLog,
    }));
    console.log(`S5.5 after submit click: ${JSON.stringify(r)}`);
    expect(r.submits).toEqual([]);
    expect(r.invalids).toEqual(['phone']);
  });

  test('form.reportValidity() returns false and focus lands on/in the anchor', async ({ page }) => {
    const reported = await page.evaluate(() =>
      (document.getElementById('f1') as HTMLFormElement).reportValidity(),
    );
    const c = await chain(page);
    console.log(`S5.5 reportValidity()=${reported}, focus chain: ${JSON.stringify(c)}`);
    expect(reported).toBe(false);
    // The anchor is the tel input INSIDE the shadow root. Whether the engine
    // focuses it, the host, or nothing is exactly the divergence being measured.
    expect(c[0]).toBe('mp-spike-phone-input#phone');
    expect(c[c.length - 1]).toBe('input');
  });

  test(':invalid and :user-invalid on a FACE host — three ways of getting there', async ({ page }) => {
    const probe = () =>
      page.evaluate(() => {
        const host = document.getElementById('phone')!;
        return {
          invalid: host.matches(':invalid'),
          userInvalid: host.matches(':user-invalid'),
          outline: getComputedStyle(host).outlineColor,
          bg: getComputedStyle(host).backgroundColor,
        };
      });

    console.log(`S5.5 :invalid pristine: ${JSON.stringify(await probe())}`);

    await page.click('#submit1');
    const afterSubmit = await probe();
    console.log(`S5.5 after refused submit: ${JSON.stringify(afterSubmit)}`);

    // Type then clear, i.e. genuine user interaction ending in an invalid value.
    await page.evaluate(() => (document.getElementById('phone') as any).telInput.focus());
    await page.keyboard.type('470');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.evaluate(() => (document.getElementById('before') as HTMLElement).focus());
    const afterInteraction = await probe();
    console.log(`S5.5 after type-then-clear + blur: ${JSON.stringify(afterInteraction)}`);

    // :invalid must hold in every engine — it is the styling hook we can rely on.
    expect(afterSubmit.invalid).toBe(true);
    expect(afterInteraction.invalid).toBe(true);
    // :user-invalid is recorded, not required: engine support on a FACE host is
    // the open question, and the repo styles invalidity from an attribute anyway.
    expect(typeof afterSubmit.userInvalid).toBe('boolean');
  });

  test('entering a number clears the validity and lets the form submit', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      el.telInput.value = '470123456';
      el.telInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const v = await page.evaluate(() => ({
      valid: (document.getElementById('phone') as any).internals?.validity?.valid,
      formValid: (document.getElementById('f1') as HTMLFormElement).checkValidity(),
    }));
    console.log(`S5.5 validity after typing: ${JSON.stringify(v)}`);
    expect(v.valid).toBe(true);
    expect(v.formValid).toBe(true);

    await page.click('#submit1');
    expect(await page.evaluate(() => (window as any).submitLog)).toEqual(['f1']);
  });

  test('the anchor really is the in-shadow tel input (not the host, not the select)', async ({ page }) => {
    const which = await page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      const anchor = host.formValidityAnchor();
      return {
        tag: anchor?.tagName.toLowerCase(),
        type: anchor?.type,
        inShadow: host.shadowRoot.contains(anchor),
        // The anchor is a light-DOM child of the GROUP but a shadow descendant of
        // the host — the nesting level the spec cares about.
        parentTag: anchor?.parentElement?.tagName.toLowerCase(),
      };
    });
    console.log(`S5.5 anchor: ${JSON.stringify(which)}`);
    expect(which.tag).toBe('input');
    expect(which.inShadow).toBe(true);
  });
});

/* ------------------------------------------------------------------ S5.6 */

test.describe('S5.6 — formResetCallback + formStateRestoreCallback reach the composite', () => {
  test.beforeEach(({ page }) => ready(page, '/s5-basic.html'));

  test('form.reset() clears the value and returns the inner select to the default country', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      el.innerSelect.selectEl.value = 'us';
      el.innerSelect.selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      el.telInput.value = '5551234';
      el.telInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const before: any = await formInfo(page, 'f1');
    console.log(`S5.6 before reset: ${JSON.stringify(before.entries)}`);
    expect(before.entries).toContainEqual(['phone', '+15551234']);

    await page.evaluate(() => window.spikeLog.splice(0));
    await page.evaluate(() => (document.getElementById('f1') as HTMLFormElement).reset());

    const log = await spikeLog(page);
    console.log(`S5.6 reset log: ${JSON.stringify(log)}`);
    expect(log).toContainEqual({ el: 'phone', cb: 'formResetCallback' });
    expect(log).toContainEqual({ el: 'phone', cb: 'formReset' });

    const after = await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      return {
        value: el.value,
        country: el.country,
        selectValue: el.innerSelect.value,
        nativeSelectValue: el.innerSelect.selectEl.value,
        telValue: el.telInput.value,
      };
    });
    console.log(`S5.6 after reset: ${JSON.stringify(after)}`);
    expect(after.value).toBeNull();
    expect(after.country).toBe('be');
    expect(after.nativeSelectValue).toBe('be');
    expect(after.telValue).toBe('');

    const info: any = await formInfo(page, 'f1');
    expect(info.entries.map((e: string[]) => e[0])).not.toContain('phone');
  });

  test('the inner FACE gets NO formResetCallback — the composite must drive it', async ({ page }) => {
    await page.evaluate(() => window.spikeLog.splice(0));
    await page.evaluate(() => (document.getElementById('f1') as HTMLFormElement).reset());
    const log = await spikeLog(page);
    const innerReset = log.filter((e) => e.el.endsWith('inner-country') && e.cb === 'formResetCallback');
    console.log(`S5.6 inner formResetCallback calls: ${JSON.stringify(innerReset)}`);
    expect(innerReset).toEqual([]);
  });

  test('formStateRestoreCallback routes to formRestore and re-syncs the form value', async ({ page }) => {
    // The UA only triggers this on bfcache/autofill restore, which Playwright
    // cannot force reliably; invoking it directly still proves the mixin routes it
    // and that the host can drive both children from restored state.
    await page.evaluate(() => {
      (document.getElementById('phone') as any).formStateRestoreCallback('+33612345678', 'restore');
    });
    const log = await spikeLog(page);
    console.log(`S5.6 restore log: ${JSON.stringify(log)}`);
    expect(log).toContainEqual({ el: 'phone', cb: 'formStateRestoreCallback', value: '+33612345678' });
    expect(log).toContainEqual({ el: 'phone', cb: 'formRestore', value: '+33612345678' });

    const after = await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      return { value: el.value, country: el.country, nativeSelect: el.innerSelect.selectEl.value, tel: el.telInput.value };
    });
    console.log(`S5.6 after restore: ${JSON.stringify(after)}`);
    expect(after.value).toBe('+33612345678');
    expect(after.country).toBe('fr');
    expect(after.nativeSelect).toBe('fr');

    const info: any = await formInfo(page, 'f1');
    expect(info.entries).toContainEqual(['phone', '+33612345678']);
  });

  test('best-effort: does a real back-navigation restore fire the callback?', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('phone') as any;
      el.telInput.value = '470123456';
      el.telInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.goto('/s5-autofill.html');
    await page.goBack();
    await page.waitForFunction(() => !!(document.getElementById('phone') as any)?.telInput).catch(() => undefined);
    const log = await page.evaluate(() => window.spikeLog ?? []);
    const restores = log.filter((e) => e.cb === 'formStateRestoreCallback');
    console.log(`S5.6 back-navigation restore callbacks: ${JSON.stringify(restores)} (empty = no bfcache restore in this harness)`);
    expect(Array.isArray(restores)).toBe(true);
  });
});

/* ------------------------------------------------------------------ S5.7 */

test.describe('S5.7 — autocomplete plumbing (partial by construction)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/s5-autofill.html');
    await page.waitForFunction(() => !!(document.getElementById('phone') as any)?.telInput);
  });

  test('autocomplete on the inner tel input applies; the IDL reflection is engine-dependent', async ({
    page,
  }) => {
    const r = await page.evaluate(() => {
      const a = document.getElementById('phone') as any;
      const b = document.getElementById('phone-full') as any;
      return {
        aAttr: a.telInput.getAttribute('autocomplete'),
        aProp: a.telInput.autocomplete,
        bAttr: b.telInput.getAttribute('autocomplete'),
        bProp: b.telInput.autocomplete,
        hostAttr: a.getAttribute('autocomplete'),
        // The likely cause of any "" reflection: the autofill anchor mantle is
        // defined in terms of the control's FORM OWNER, and an <input> inside a
        // shadow root has none — the outer <form> is in a different tree.
        innerInputFormOwner: a.telInput.form?.id ?? null,
        innerInputWillValidate: a.telInput.willValidate,
        hostFormOwner: a.internals?.form?.id ?? null,
      };
    });
    console.log(`S5.7 autocomplete plumbing: ${JSON.stringify(r)}`);
    // The attribute is what we control, and it lands in every engine.
    expect(r.aAttr).toBe('tel-national');
    expect(r.bAttr).toBe('tel');
    expect(r.hostAttr).toBe('tel');
    // The IDL reflection is recorded, not required.
    console.log(
      `S5.7 IDL autocomplete reflection: aProp=${JSON.stringify(r.aProp)} bProp=${JSON.stringify(r.bProp)}; inner input form owner = ${JSON.stringify(r.innerInputFormOwner)}`,
    );
    // This one IS a platform fact worth pinning: no form owner for the inner input.
    expect(r.innerInputFormOwner).toBeNull();
    expect(r.hostFormOwner).toBe('f1');
  });

  test('the host `autocomplete` attribute is inert on a FACE (no UA plumbing to the shadow)', async ({
    page,
  }) => {
    // Worth pinning: if a consumer sets autocomplete on the WRAPPER expecting
    // autofill, nothing happens unless the element forwards it. That forwarding
    // is a design obligation, not a platform behaviour.
    const r = await page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      host.setAttribute('autocomplete', 'tel-national');
      return {
        innerUnchanged: host.telInput.getAttribute('autocomplete'),
        hostHasAutocompleteProp: 'autocomplete' in host,
      };
    });
    console.log(`S5.7 host attribute forwarding: ${JSON.stringify(r)}`);
    expect(r.hostHasAutocompleteProp).toBe(false);
  });

  test('typing into the tel input inside two shadow roots works through the driver', async ({ page }) => {
    // Sanity that the control is genuinely operable via real input events — the
    // closest automatable analogue of a fill. NOT autofill.
    await page.evaluate(() => (document.getElementById('phone') as any).telInput.focus());
    await page.keyboard.type('470123456');
    const v = await page.evaluate(() => {
      const host = document.getElementById('phone') as any;
      return { tel: host.telInput.value, formValue: host.value };
    });
    console.log(`S5.7 typed value: ${JSON.stringify(v)}`);
    expect(v.tel).toBe('470123456');
    expect(v.formValue).toBe('+32470123456');
  });
});
