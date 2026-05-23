// Angular wrappers (M2). The legacy `card/` + `card-header/` directories
// have been removed; consumers continue to import `BsCardComponent` and
// `BsCardHeaderComponent` via the same `@mintplayer/ng-bootstrap/card`
// secondary entry — only the internal file paths moved.
export * from './lib/components/bs-card/bs-card.component';
export * from './lib/components/bs-card-header/bs-card-header.component';
export * from './lib/components/bs-card-body/bs-card-body.component';
export * from './lib/components/bs-card-footer/bs-card-footer.component';
export * from './lib/components/bs-card-title/bs-card-title.component';
export * from './lib/components/bs-card-subtitle/bs-card-subtitle.component';
export * from './lib/components/bs-card-text/bs-card-text.component';
export * from './lib/components/bs-card-link/bs-card-link.component';
export * from './lib/components/bs-card-img/bs-card-img.component';
export * from './lib/components/bs-card-group/bs-card-group.component';

// Lit web-component layer + public types — now sourced from the
// framework-agnostic @mintplayer/web-components/card sub-entry.
export * from '@mintplayer/web-components/card';
