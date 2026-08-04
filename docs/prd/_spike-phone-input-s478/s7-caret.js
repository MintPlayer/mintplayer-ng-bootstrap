// S7 rig — three inputs driven by libphonenumber-js `AsYouType`:
//   #naive   light DOM, the obvious `input.value = formatted` (the bug)
//   #fixed   light DOM, digit-index caret mapping + separator-aware delete
//   shadow   the same fixed logic, but the input lives in a shadow root (S7.3)
import { formatNationalViaInternational } from './phone-format.mjs';
import { reformatWithCaret, deleteAcrossSeparators, digitsOf } from './s7-caret-core.js';

// The dial code is static adjacent text (PRD D9), so the input holds the national
// significant number only — which is exactly why the formatter has to go through
// the international form (see phone-format.mjs).
let dialCode = '32';
const format = (digits) => formatNationalViaInternational(dialCode, digits);

const log = [];
window.__s7log = log;

function wireNaive(input) {
  input.addEventListener('input', () => {
    const before = input.selectionStart;
    input.value = format(digitsOf(input.value));
    log.push(`naive: caretBefore=${before} caretAfter=${input.selectionStart} value="${input.value}"`);
  });
}

function wireFixed(input) {
  // Composition (IME): never rewrite the value mid-composition — every engine
  // cancels or garbles the composition session if you do.
  let composing = false;
  // Last committed state, so a no-digit-change edit (a letter, a stray dash) can
  // restore rather than recompute the caret.
  let previous = { value: '', digits: '', caret: 0 };

  const apply = ({ value, caret }) => {
    if (input.value !== value) input.value = value;
    input.setSelectionRange(caret, caret);
    previous = { value, digits: digitsOf(value), caret };
  };
  input.__resetCaretState = () => {
    previous = { value: input.value, digits: digitsOf(input.value), caret: input.value.length };
  };

  // `beforeinput` fires while the caret is still where the user left it, so this
  // is the only reliable source for "where the caret was before this edit".
  input.addEventListener('beforeinput', () => {
    previous = { ...previous, caret: input.selectionStart ?? 0 };
  });

  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => {
    composing = false;
    apply(reformatWithCaret(input.value, input.selectionStart ?? 0, format, previous));
  });

  input.addEventListener('keydown', (e) => {
    if (composing || e.isComposing) return;
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const res = deleteAcrossSeparators(
      input.value,
      input.selectionStart ?? 0,
      input.selectionEnd ?? 0,
      e.key === 'Backspace' ? 'backward' : 'forward',
      format,
    );
    if (res) {
      e.preventDefault();
      apply(res);
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      log.push(`sep-delete(${e.key}): value="${input.value}" caret=${input.selectionStart}`);
    }
  });

  input.addEventListener('input', (e) => {
    if (composing || e.isComposing) return;
    const before = input.selectionStart;
    apply(reformatWithCaret(input.value, input.selectionStart ?? 0, format, previous));
    log.push(`fixed(${e.inputType ?? '?'}): caretBefore=${before} caretAfter=${input.selectionStart} value="${input.value}"`);
  });
}

const naive = document.getElementById('naive');
const fixed = document.getElementById('fixed');
wireNaive(naive);
wireFixed(fixed);

// S7.3 — same logic, input inside a closed-over open shadow root.
const host = document.getElementById('host');
const root = host.attachShadow({ mode: 'open' });
root.innerHTML = `<style>input{font:14px monospace;width:22em}</style><input id="shadow" type="tel" />`;
const shadowInput = root.getElementById('shadow');
wireFixed(shadowInput);

window.__s7 = {
  setDialCode: (c) => { dialCode = c; },
  format,
  shadowInput: () => shadowInput,
  read: (which) => {
    const el = which === 'shadow' ? shadowInput : document.getElementById(which);
    return { value: el.value, selectionStart: el.selectionStart, selectionEnd: el.selectionEnd };
  },
  setValue: (which, v) => {
    const el = which === 'shadow' ? shadowInput : document.getElementById(which);
    el.value = v;
    el.setSelectionRange(v.length, v.length);
    el.__resetCaretState?.();
  },
  setCaret: (which, pos) => {
    const el = which === 'shadow' ? shadowInput : document.getElementById(which);
    el.setSelectionRange(pos, pos);
  },
  focus: (which) => {
    const el = which === 'shadow' ? shadowInput : document.getElementById(which);
    el.focus();
  },
  activeElements: () => ({
    documentActive: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
    shadowActive: host.shadowRoot.activeElement
      ? host.shadowRoot.activeElement.tagName + '#' + host.shadowRoot.activeElement.id
      : null,
  }),
};
window.__s7ready = true;
