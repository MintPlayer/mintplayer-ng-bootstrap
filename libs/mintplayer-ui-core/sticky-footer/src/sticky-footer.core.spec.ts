import { hostCore } from '../../_conformance/host-core';
import { stickyFooterCore, stickyFooterParentCore } from './sticky-footer.core';

describe('sticky footer cores', () => {
  it('render the parent and the footer', () => {
    expect(hostCore(stickyFooterParentCore, {}).props()).toEqual({ class: 'sticky-footer-parent' });
    expect(hostCore(stickyFooterCore, {}).props().view.root).toEqual({ class: 'sticky-footer' });
  });
});
