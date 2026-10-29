import { describe, expect, it } from 'vitest';
import { connectShell, shellChecks, shouldDismissShell } from './shell';

describe('shell core', () => {
  it('checked means revealed in both modes: auto is closed narrow, open wide', () => {
    expect(shellChecks('auto')).toEqual({ narrow: false, wide: true });
    expect(shellChecks('show')).toEqual({ narrow: true, wide: true });
    expect(shellChecks('hide')).toEqual({ narrow: false, wide: false });
    expect(shellChecks(null)).toEqual({ narrow: false, wide: true });
  });

  it('wires every IDREF from the root id', () => {
    const view = connectShell({ id: 's1' });
    const [narrow, wide] = view.toggles;
    expect(narrow.input['id']).toBe('s1-toggle-narrow');
    expect(narrow.label['for']).toBe('s1-toggle-narrow');
    expect(wide.label['for']).toBe('s1-toggle-wide');
    expect(narrow.input['aria-controls']).toBe('s1-sidebar');
    expect(view.sidebar['id']).toBe('s1-sidebar');
    expect(view.skipHref).toBe('#s1-content');
    expect(view.content).toMatchObject({ id: 's1-content', role: 'main', tabindex: '0' });
    expect(wide.input['checked']).toBe(true);
    expect(narrow.input['checked']).toBeNull();
  });

  it('keeps the native checkbox role and localizes every name', () => {
    const view = connectShell({ id: 's', labels: { toggle: 'Zijbalk tonen', sidebar: 'Zijbalk' } });
    expect(view.toggles[0].input['role']).toBeUndefined();
    expect(view.toggles[0].input['aria-label']).toBe('Zijbalk tonen');
    expect(view.sidebar['aria-label']).toBe('Zijbalk');
    expect(view.skipText).toBe('Skip to content');
  });

  it('stamps the scope and the root attributes on every node', () => {
    const view = connectShell({ id: 's', breakpoint: 'lg', externalToggle: true });
    expect(view.root).toMatchObject({ 'data-mps': 'shell', 'data-breakpoint': 'lg', 'data-external-toggle': '' });
    expect([view.skip, view.topbar, view.sidebarRoot, view.sidebar, view.content].every((bag) => bag['data-mps'] === 'shell')).toBe(true);
  });

  it('dismisses only for an href link inside the sidebar without data-no-dismiss', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <input class="shell-toggle shell-toggle-narrow" data-mps="shell" type="checkbox" checked>
      <div class="sidebar-root" data-mps="shell"><aside class="sidebar" data-mps="shell">
        <a id="leaf" href="/x">x</a><div data-no-dismiss><a id="parent" href="/y">y</a></div><span id="text">t</span>
      </aside></div>`;
    document.body.append(root);
    const click = (id: string) => {
      let result = false;
      root.addEventListener('click', (event) => { result = shouldDismissShell(event, root); event.preventDefault(); }, { once: true });
      root.querySelector<HTMLElement>(`#${id}`)!.click();
      return result;
    };
    // jsdom computes no custom properties, so the mode resolves to narrow.
    expect(click('leaf')).toBe(true);
    expect(click('parent')).toBe(false);
    expect(click('text')).toBe(false);
    root.remove();
  });
});
