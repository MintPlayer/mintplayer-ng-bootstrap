import { describe, expect, it } from 'vitest';
import { connectModal, type ModalInputs } from './modal.core';

const inputs = (patch: Partial<ModalInputs> = {}): ModalInputs => ({
  open: true,
  scrollable: false,
  centered: false,
  size: null,
  closeOnEscape: true,
  closeOnBackdrop: true,
  closeButton: true,
  closeLabel: 'Close',
  ...patch,
});

describe('modal', () => {
  it('is a modal dialog named by its title', () => {
    const view = connectModal(inputs(), 'shown', 'm1', null);
    expect(view.modal).toMatchObject({ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'm1-title', 'aria-label': null });
    expect(view.title['id']).toBe('m1-title');
  });

  it('a consumer label wins over the title', () => {
    const view = connectModal(inputs(), 'shown', 'm1', 'Settings');
    expect(view.modal['aria-label']).toBe('Settings');
    expect(view.modal['aria-labelledby']).toBeNull();
  });

  it('renders from the phase, and carries .show only when shown', () => {
    expect(connectModal(inputs(), 'closed', 'm', null).rendered).toBe(false);
    const entering = connectModal(inputs(), 'entering', 'm', null);
    expect(entering.rendered).toBe(true);
    expect(entering.modal['class']).toBe('modal fade');
    expect(entering.backdrop['class']).toBe('modal-backdrop fade');
    expect(connectModal(inputs(), 'shown', 'm', null).modal['class']).toBe('modal fade show');
    expect(connectModal(inputs(), 'leaving', 'm', null).rendered).toBe(true);
  });

  it('names the close button, and hides the backdrop from assistive technology', () => {
    const view = connectModal(inputs({ closeLabel: 'Sluiten' }), 'shown', 'm', null);
    expect(view.close).toMatchObject({ class: 'btn-close', type: 'button', 'aria-label': 'Sluiten', 'data-bs-dismiss': 'modal' });
    expect(view.backdrop['aria-hidden']).toBe('true');
    expect(connectModal(inputs({ closeButton: false }), 'shown', 'm', null).close).toBeNull();
  });

  it('maps the layout inputs onto the dialog, ignoring an unknown size', () => {
    expect(connectModal(inputs({ scrollable: true, centered: true, size: 'lg' }), 'shown', 'm', null).dialog['class']).toBe(
      'modal-dialog modal-dialog-scrollable modal-dialog-centered modal-lg',
    );
    expect(connectModal(inputs({ size: 'huge' as never }), 'shown', 'm', null).dialog['class']).toBe('modal-dialog');
  });
});
