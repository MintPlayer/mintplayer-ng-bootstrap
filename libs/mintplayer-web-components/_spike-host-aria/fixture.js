/* Spike fixture — throwaway. Plain classic script so it can be injected with
   page.addScriptTag({ content }) and needs no dev server at all. */

/* 0.2a — role via internals only, no `role` attribute anywhere. */
class RoleHost extends HTMLElement {
  constructor() {
    super();
    this.internals = this.attachInternals();
    this.internals.role = 'group';
    this.attachShadow({ mode: 'open' }).innerHTML = '<span>inner</span>';
  }
}
customElements.define('mp-role-host', RoleHost);

class ListboxHost extends HTMLElement {
  constructor() {
    super();
    this.internals = this.attachInternals();
    this.internals.role = 'listbox';
    this.attachShadow({ mode: 'open' }).innerHTML = '<span>inner</span>';
  }
}
customElements.define('mp-listbox-host', ListboxHost);

/* Control: no role at all => implicit `generic`, where naming is prohibited.
   This is the defect Phase B exists to fix; it must FAIL to expose a name. */
class NoRoleHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<span>inner</span>';
  }
}
customElements.define('mp-no-role-host', NoRoleHost);

/* Control: role as a plain attribute — the fallback if 0.2a fails. */
class AttrRoleHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<span>inner</span>';
  }
}
customElements.define('mp-attr-role-host', AttrRoleHost);

/* 0.2b — cross-root element references, inner shadow node -> outer document label. */
class RefHost extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<input id="inner-input" type="text">';
  }
  connectedCallback() {
    const input = this.shadowRoot.getElementById('inner-input');
    const outer = document.getElementById('outer-label');
    if ('ariaLabelledByElements' in input) {
      input.ariaLabelledByElements = [outer];
    }
  }
}
customElements.define('mp-ref-host', RefHost);

/* Negative that motivates the design: the same relationship as an IDREF string
   from inside the shadow root must resolve to nothing. */
class StrHost extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<input id="inner-input-str" type="text" aria-labelledby="outer-label">';
  }
}
customElements.define('mp-str-host', StrHost);

/* 0.2b variant (i): internals.ariaLabelledByElements naming the HOST. */
class InternalsRefHost extends HTMLElement {
  constructor() {
    super();
    this.internals = this.attachInternals();
    this.internals.role = 'group';
    this.attachShadow({ mode: 'open' }).innerHTML = '<span>inner</span>';
  }
  connectedCallback() {
    const outer = document.getElementById('outer-label');
    if ('ariaLabelledByElements' in this.internals) {
      this.internals.ariaLabelledByElements = [outer];
    }
  }
}
customElements.define('mp-internals-ref-host', InternalsRefHost);
