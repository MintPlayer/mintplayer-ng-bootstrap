// Angular wrappers (M2). The legacy `card/` + `card-header/` directories
// have been removed; consumers continue to import `BsCardComponent` and
// `BsCardHeaderComponent` via the same `@mintplayer/ng-bootstrap/card`
// secondary entry — only the internal file paths moved.
export * from './lib/components/bs-card.component';
export * from './lib/components/bs-card-header.component';
export * from './lib/components/bs-card-body.component';
export * from './lib/components/bs-card-footer.component';
export * from './lib/components/bs-card-title.component';
export * from './lib/components/bs-card-subtitle.component';
export * from './lib/components/bs-card-text.component';
export * from './lib/components/bs-card-link.component';
export * from './lib/components/bs-card-img.component';
export * from './lib/components/bs-card-group.component';

// Lit web-component layer (M1).
export * from './lib/web-components/mp-card.element';
export * from './lib/web-components/mp-card-header.element';
export * from './lib/web-components/mp-card-body.element';
export * from './lib/web-components/mp-card-footer.element';
export * from './lib/web-components/mp-card-title.element';
export * from './lib/web-components/mp-card-subtitle.element';
export * from './lib/web-components/mp-card-text.element';
export * from './lib/web-components/mp-card-link.element';
export * from './lib/web-components/mp-card-img.element';
export * from './lib/web-components/mp-card-group.element';

// Public types.
export * from './lib/types/card-image-position';
export * from './lib/types/card-header-nav-style';
