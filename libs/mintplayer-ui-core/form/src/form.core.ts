import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * `bs-form` (#458 M5): a real `<form>`, stamped, so it anchors Bootstrap's
 * forms part — the consumer's `.form-label`, `.form-control`, `.form-text`,
 * `.form-check-input`, … inside it are styled by this import alone.
 *
 *   <div class="form-host"><form action method>…content…</form></div>
 *
 * Never nest another `<form>` inside: the HTML parser drops a nested form tag,
 * so a server-rendered page would hydrate against a shallower DOM. Put
 * `[formGroup]` on a div instead.
 *
 * Submitting emits `submitted` with the event. Without an `action` the native
 * submit (a reload to the same URL) is cancelled, since the page handles it;
 * with one, the browser submits as usual. No-JS tier 2: a plain form, which
 * submits natively to its `action`.
 */
/** The methods a `<form>` can submit with (a browser treats any other as GET). */
export type FormMethod = 'GET' | 'POST';

export interface FormInputs {
  /** Where the browser submits the form; leave unset when the page handles `submitted`. */
  action: string | null;
  method: FormMethod | null;
}

/** The `submitted` payload: the native submit event. */
export type FormSubmitEvent = Event;

export interface FormView {
  readonly root: CoreBag;
  readonly form: CoreBag;
  /** A URL: bound by the template, never carried in a bag. `undefined` writes no attribute. */
  readonly action: string | undefined;
}

export function connectForm({ method }: Pick<FormInputs, 'method'>, action: string | null): FormView {
  return { root: { class: 'form-host' }, form: { method: method ? method.toLowerCase() : null }, action: action || undefined };
}

export const formCore = defineCore<FormInputs, object, { view: FormView }, { submitted: FormSubmitEvent }>({
  view: ({ inputs }) => ({ view: connectForm(inputs, inputs.action) }),
  attach: (api) => {
    const onSubmit = (event: Event) => {
      const form = event.target as Element | null;
      // Only this component's own form, not one a consumer nested (which the parser drops anyway).
      if (!form || (form.parentElement !== api.host && form !== api.host)) return;
      if (!api.inputs().action) event.preventDefault();
      api.emit('submitted', event);
    };
    api.host.addEventListener('submit', onSubmit);
    return () => api.host.removeEventListener('submit', onSubmit);
  },
});

/**
 * `.form-control` on the consumer's input or textarea. In Angular it applies by
 * itself to every input and textarea inside a `bs-form` (opt out with
 * `.no-form-control`); the other fronts place it explicitly.
 */
export const formControlCore = defineCore<Record<never, never>, Record<never, never>, CoreBag>({
  view: () => ({ class: 'form-control' }),
});

/** `.col-form-label` on the consumer's label: a label that lines up with a control in a grid row. */
export const colFormLabelCore = defineCore<Record<never, never>, Record<never, never>, CoreBag>({
  view: () => ({ class: 'col-form-label' }),
});
