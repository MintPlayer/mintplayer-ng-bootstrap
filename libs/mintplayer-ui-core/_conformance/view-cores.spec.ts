/**
 * The view-only cores (no attach, no state): each renders its connect
 * function's bags through `view`, which is all a front calls.
 */
import { hostCore } from './host-core';
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
  });
});
