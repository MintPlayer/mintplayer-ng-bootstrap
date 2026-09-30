import { describe, expect, it, vi } from 'vitest';

vi.mock('./mp-shell-chrome.generated', () => ({
  MP_SHELL_DSD_CHROME: '<template shadowrootmode="open">[shell]</template>',
}));

import { injectMpShellDsd } from './inject-mp-shell-dsd';

describe('injectMpShellDsd', () => {
  it('returns HTML without a shell unchanged', () => {
    const html = '<main><p>no shell</p></main>';
    expect(injectMpShellDsd(html)).toBe(html);
  });

  it('splices the chrome after every mp-shell open tag, keeping its attributes', () => {
    const out = injectMpShellDsd('<mp-shell state="auto"><nav slot="sidebar"></nav></mp-shell><mp-shell></mp-shell>');
    expect(out).toBe(
      '<mp-shell state="auto"><template shadowrootmode="open">[shell]</template><nav slot="sidebar"></nav></mp-shell>' +
        '<mp-shell><template shadowrootmode="open">[shell]</template></mp-shell>',
    );
  });

  it('is idempotent per element, even when another component already emitted DSD', () => {
    const html = '<x-other><template shadowrootmode="open"></template></x-other><mp-shell></mp-shell>';
    const once = injectMpShellDsd(html);
    expect(once).toContain('<mp-shell><template shadowrootmode="open">[shell]</template>');
    expect(injectMpShellDsd(once)).toBe(once);
  });
});
