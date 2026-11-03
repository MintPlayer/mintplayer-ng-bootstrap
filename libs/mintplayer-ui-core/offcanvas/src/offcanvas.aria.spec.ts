import { describe, expect, it } from 'vitest';
import { connectOffcanvas, type OffcanvasInputs } from './offcanvas.core';

const inputs = (patch: Partial<OffcanvasInputs> = {}): OffcanvasInputs => ({
  open: true,
  position: 'start',
  size: null,
  backdrop: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  closeButton: true,
  closeLabel: 'Close',
  noPadding: false,
  ...patch,
});

describe('offcanvas', () => {
  it('is a dialog named by its title, modal only with a backdrop', () => {
    const modal = connectOffcanvas(inputs(), 'shown', 'o', null);
    expect(modal.panel).toMatchObject({ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'o-title' });
    expect(modal.backdrop).toMatchObject({ class: 'offcanvas-backdrop fade show', 'aria-hidden': 'true' });
    const panel = connectOffcanvas(inputs({ backdrop: false }), 'shown', 'o', null);
    expect(panel.panel['aria-modal']).toBeNull();
    expect(panel.backdrop).toBeNull();
  });

  it('a consumer label wins over the title', () => {
    const view = connectOffcanvas(inputs(), 'shown', 'o', 'Menu');
    expect(view.panel['aria-label']).toBe('Menu');
    expect(view.panel['aria-labelledby']).toBeNull();
  });

  it("follows Bootstrap's phase classes: hidden, .show, then .hiding while it slides out", () => {
    expect(connectOffcanvas(inputs(), 'closed', 'o', null).rendered).toBe(false);
    expect(connectOffcanvas(inputs(), 'entering', 'o', null).panel['class']).toBe('offcanvas offcanvas-start');
    expect(connectOffcanvas(inputs(), 'shown', 'o', null).panel['class']).toBe('offcanvas offcanvas-start show');
    expect(connectOffcanvas(inputs(), 'leaving', 'o', null).panel['class']).toBe('offcanvas offcanvas-start hiding');
  });

  it("sizes through Bootstrap's own custom property for the edge, and falls back to start", () => {
    expect(connectOffcanvas(inputs({ size: 320 }), 'shown', 'o', null).panelStyle).toEqual({ '--bs-offcanvas-width': '320px' });
    expect(connectOffcanvas(inputs({ position: 'bottom', size: 80 }), 'shown', 'o', null).panelStyle).toEqual({ '--bs-offcanvas-height': '80px' });
    expect(connectOffcanvas(inputs(), 'shown', 'o', null).panelStyle).toEqual({});
    expect(connectOffcanvas(inputs({ position: 'left' as never }), 'shown', 'o', null).panel['class']).toBe('offcanvas offcanvas-start show');
  });

  it('names the close button and can drop the body padding', () => {
    const view = connectOffcanvas(inputs({ closeLabel: 'Sluiten', noPadding: true }), 'shown', 'o', null);
    expect(view.close).toMatchObject({ 'aria-label': 'Sluiten', 'data-bs-dismiss': 'offcanvas' });
    expect(view.body['class']).toBe('offcanvas-body p-0');
  });
});
