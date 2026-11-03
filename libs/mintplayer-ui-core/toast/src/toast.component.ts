import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The toast's manifest (#458 M6): `bs-toast`, `bs-toast-header`, `bs-toast-body`
 * and `bs-toaster` (Angular), `BsToast…` (React, Vue), `mp-toast…` (Lit). The
 * toaster replaces the Angular-only `BsToastService` / `bs-toast-container`:
 * the queue is the framework-neutral `ToastQueue`.
 */
export default {
  group: 'toast',
  style: { scope: 'toast', bootstrap: ['toasts', 'close', 'transitions'] },
  components: {
    toast: {
      core: 'toastCore',
      doc: [
        "Bootstrap's toast. `visible` is two-way: it fades in and out with Bootstrap's phases, and",
        'turning visible announces its text (`politeness`). A `toast-header` close button hides it.',
      ].join('\n'),
      inputs: {
        type: 'ToastInputs',
        fields: {
          visible: { default: 'false', model: true },
          politeness: { default: "'polite'", kind: 'string' },
        },
      },
      outputs: {
        visibleChange: { type: 'boolean', doc: 'The user dismissed the toast.' },
      },
    },
    'toast-header': {
      core: 'toastHeaderCore',
      doc: "The toast's header; `dismissible` adds a close button named by `closeLabel`.",
      inputs: {
        type: 'ToastHeaderInputs',
        fields: {
          dismissible: { default: 'true' },
          closeLabel: { default: "'Close'", kind: 'string' },
        },
      },
    },
    'toast-body': {
      core: 'toastBodyCore',
      doc: "The toast's body.",
    },
    toaster: {
      core: 'toasterCore',
      doc: [
        'Renders a `ToastQueue`: a fixed `toast-container` at `placement`, with the `toast` slot once per',
        "entry (bind the entry's `visible`, and close it on `visibleChange`). Autohide pauses while the",
        'pointer or focus is inside.',
      ].join('\n'),
      inputs: {
        type: 'ToasterInputs',
        fields: {
          queue: { default: 'null', kind: false },
          placement: { default: "'bottom-end'", kind: 'string' },
        },
      },
    },
  },
} satisfies ComponentGroup;
