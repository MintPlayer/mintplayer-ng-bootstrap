import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The form group's manifest (#458 M5): `bs-form` (Angular), `BsForm` (React,
 * Vue) and `mp-form` (Lit), plus the `form-control` and `col-form-label`
 * directives. Every element is stamped and the forms part rides this group.
 */
export default {
  group: 'form',
  style: { scope: 'form', bootstrap: ['forms'] },
  components: {
    form: {
      core: 'formCore',
      doc: [
        'A real `<form>` that anchors Bootstrap\'s forms part for everything inside it. `submitted` reports a submit;',
        'without an `action` the native submit is cancelled.',
      ].join('\n'),
      inputs: {
        type: 'FormInputs',
        fields: {
          action: { default: 'null', kind: 'string' },
          method: { default: 'null', kind: 'string' },
        },
      },
      outputs: {
        submitted: { type: 'FormSubmitEvent', doc: 'The form was submitted.' },
      },
    },
  },
  directives: {
    'form-control': {
      core: 'formControlCore',
      doc: "Bootstrap's `.form-control` on an input or textarea.",
      names: {
        angular: 'BsFormControlDirective',
        selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)',
      },
    },
    'col-form-label': {
      core: 'colFormLabelCore',
      doc: "Bootstrap's `.col-form-label` on a label that lines up with a control in a grid row.",
    },
  },
} satisfies ComponentGroup;
