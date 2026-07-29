import { describe, expect, it, vi } from 'vitest';

vi.mock('./mp-dropdown-chrome.generated', () => ({
  MP_DROPDOWN_MENU_DSD_CHROME: '<template shadowrootmode="open">[chrome]</template>',
}));

import { injectMpDropdownDsd } from './inject-mp-dropdown-dsd';

describe('injectMpDropdownDsd', () => {
  it('leaves HTML without a dropdown untouched', () => {
    const html = '<main><p>nothing</p></main>';
    expect(injectMpDropdownDsd(html)).toBe(html);
  });

  it('splices the chrome after each open tag', () => {
    const out = injectMpDropdownDsd('<mp-dropdown-menu><li class="dropdown-item">A</li></mp-dropdown-menu>');
    expect(out).toContain('<mp-dropdown-menu><template shadowrootmode="open">[chrome]</template>');
  });

  it('is idempotent', () => {
    const once = injectMpDropdownDsd('<mp-dropdown-menu><li class="dropdown-item">A</li></mp-dropdown-menu>');
    expect(injectMpDropdownDsd(once)).toBe(once);
  });

  it('stamps role="menuitem" on plain items in menu mode (the default)', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu><li class="dropdown-item">A</li><li class="dropdown-item">B</li></mp-dropdown-menu>',
    );
    expect(out.match(/role="menuitem"/g)?.length).toBe(2);
  });

  it('stamps role="option" in listbox mode', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu mode="listbox"><li class="dropdown-item">A</li></mp-dropdown-menu>',
    );
    expect(out).toContain('role="option"');
    expect(out).not.toContain('menuitem');
  });

  it('puts the role on the item\'s first link/button and presentation on the item', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu><li class="dropdown-item"><a href="/x">Go</a></li></mp-dropdown-menu>',
    );
    expect(out).toMatch(/<li class="dropdown-item" role="presentation"><a href="\/x" role="menuitem">/);
  });

  it('skips dividers and headers', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu><li class="dropdown-divider"></li><li class="dropdown-header">H</li><li class="dropdown-item">A</li></mp-dropdown-menu>',
    );
    expect(out.match(/role="menuitem"/g)?.length).toBe(1);
  });

  it('never overwrites an authored role', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu><li class="dropdown-item" role="none">A</li></mp-dropdown-menu>',
    );
    expect(out).toContain('role="none"');
    expect(out).not.toContain('menuitem');
  });

  it('a nested menu\'s items get the NESTED menu\'s mode, not the outer one\'s', () => {
    const out = injectMpDropdownDsd(
      `<mp-dropdown-menu>
        <li class="dropdown-item">outer</li>
        <li class="dropdown-item"><mp-dropdown-menu mode="listbox"><li class="dropdown-item">inner</li></mp-dropdown-menu></li>
      </mp-dropdown-menu>`,
    );
    expect(out).toContain('role="option"');
    // The outer item hosting the nested menu still gets its own role.
    expect((out.match(/role="menuitem"/g) ?? []).length).toBe(2);
  });

  it('leaves dropdown-item classes outside any menu alone', () => {
    const html = '<div class="dropdown-item">not in a menu</div>';
    expect(injectMpDropdownDsd(html)).toBe(html);
  });

  it('does not read a > inside an attribute value as a tag end', () => {
    const out = injectMpDropdownDsd(
      '<mp-dropdown-menu aria-label="a > b"><li class="dropdown-item">A</li></mp-dropdown-menu>',
    );
    expect(out).toContain('role="menuitem"');
  });
});
