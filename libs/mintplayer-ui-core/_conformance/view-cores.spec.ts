/**
 * The view-only cores (no attach, no state): each renders its connect
 * function's bags through `view`, which is all a front calls.
 */
import { el, hostCore } from './host-core';
import { floatingLabelCore } from '../floating-labels/src/floating-label.core';
import { gridColCore, gridColumnCore, gridCore, gridRowCore } from '../grid/src/grid.core';
import { progressBarCore, progressCore } from '../progress-bar/src/progress-bar.core';
import { breadcrumbCore, breadcrumbItemCore } from '../breadcrumb/src/breadcrumb.core';
import { buttonGroupCore } from '../button-group/src/button-group.core';
import { closeCore } from '../close/src/close.core';
import { listGroupCore, listGroupItemCore } from '../list-group/src/list-group.core';
import { tableCore } from '../table/src/table.core';

afterEach(() => document.body.replaceChildren());

describe('view-only cores', () => {
  it('render their bags through view', () => {
    expect(hostCore(breadcrumbCore, { label: 'Path' }).props().view.nav['aria-label']).toBe('Path');
    expect(hostCore(breadcrumbItemCore, { active: true }).props().root['aria-current']).toBe('page');
    expect(hostCore(buttonGroupCore, { label: 'Tools', vertical: true, size: null }).props().root).toMatchObject({ role: 'group', 'aria-label': 'Tools' });
    expect(hostCore(closeCore, { label: 'Close', disabled: true }).props().view.button).toMatchObject({ 'aria-label': 'Close', disabled: '' });
    expect(hostCore(listGroupCore, { flush: true }).props().root['class']).toBe('list-group list-group-flush');
    expect(hostCore(listGroupItemCore, { active: true, disabled: false, color: 'danger' }).props().root['class']).toBe('list-group-item list-group-item-danger active');
    expect(hostCore(tableCore, { responsive: true, striped: true, hover: false, bordered: false }).props().view).toBeTruthy();
    expect(hostCore(gridCore, { stopFullWidthAt: 'lg' }).props().root['class']).toBe('grid-host container-lg');
    expect([hostCore(gridRowCore, {}).props(), hostCore(gridColCore, {}).props()]).toEqual([{ class: 'row' }, { class: 'col' }]);
    expect(hostCore(gridColumnCore, { md: 6 }).props()).toEqual({ class: 'col-md-6' });
    expect(hostCore(progressCore, { height: 8, indeterminate: true, label: 'Loading' }).props().view.indeterminate).toMatchObject({ role: 'progressbar', 'aria-label': 'Loading' });
    const bar = hostCore(progressBarCore, { minimum: 0, maximum: 10, value: 5, color: 'primary', striped: false, animated: false, label: 'Progress', valueText: null } as never, { label: 'Upload' });
    expect(bar.props().view.bar['aria-label']).toBe('Upload');
  });
});

describe('floating label', () => {
  it('points an unattached label at its control once attached, leaving a consumer’s own for alone', () => {
    const h = hostCore(floatingLabelCore, {}, { markup: () => [el('input'), el('label', null, 'Name')] });
    h.attach();
    const input = h.host.querySelector('input')!;
    expect(input.id).toMatch(/^mp-floating-label-/);
    expect(h.host.querySelector('label')!.htmlFor).toBe(input.id);
    h.dispose();

    const own = hostCore(floatingLabelCore, {}, { markup: () => [el('input', { id: 'mine' }), el('label', { for: 'other' })] });
    own.attach();
    expect(own.host.querySelector('label')!.htmlFor).toBe('other');
    const bare = hostCore(floatingLabelCore, {}, { markup: () => [el('input')] });
    bare.attach();
    expect(bare.host.querySelector('input')!.id).toBe('');
  });
});
